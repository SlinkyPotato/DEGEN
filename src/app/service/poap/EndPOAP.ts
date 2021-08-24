import { AwaitMessagesOptions, DMChannel, Guild, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Cursor, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import axios from 'axios';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne({
		event: event,
		poapManagerId: guildMember.user.id,
	}, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError(`Sorry ${event} is not active. Please try /poap start.`);
	}
	console.log(`event ${event} ended`);
	const listOfParticipants = await getListOfParticipants(guildMember, db, event);
	const bufferFile = await getBufferFromParticipants(listOfParticipants, event);
	const currentDate = (new Date()).toISOString();
	await guildMember.send({
		content: `Hello! There were a total of \`${listOfParticipants.length} participants\` for ${event} on \`${currentDate} UTC\`.`,
		files: [{ name: `${event}_${listOfParticipants.length}_participants.txt`, attachment: bufferFile }],
	});

	const sendOutPOAPReplyMessage = await guildMember.send({ content: 'Would you like me send out POAP links to participants? `(default: no)`' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await guildMember.send({ content: 'Ok! Please send a file of the POAP links (url per line).' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		await sendOutPOAPLinks(guildMember.guild, listOfParticipants, poapLinksFile);
	} else {
		await guildMember.send({ content: 'Please do `/poap end` command if you change your mind.' });
	}
	return dbInstance.close();
};

export const getListOfParticipants = async (guildMember: GuildMember, db: Db, event: string)
	: Promise<{id: string, tag: string}[]> => {
	const poapParticipants: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const resultCursor: Cursor<POAPParticipant> = await poapParticipants.find({
		event: event,
	});

	if ((await resultCursor.count()) === 0) {
		console.log(`no participants found for ${event}`);
		return [];
	}

	const participants = [];
	await resultCursor.forEach((participant: POAPParticipant) => {
		participants.push({ id: participant.discordId, tag: participant.discordTag });
	});

	return participants;
};

export const getBufferFromParticipants = async (participants: {id: string, tag: string}[], event: string): Promise<Buffer> => {
	if (participants.length === 0) {
		console.log(`no participants found for ${event}`);
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = '';
	participants.forEach((participant: {id: string, tag: string}) => {
		participantsStr += participant.tag + '\n';
	});

	return Buffer.from(participantsStr, 'utf-8');
};

export const sendOutPOAPLinks = async (guild: Guild, listOfParticipants: any[], attachment: MessageAttachment): Promise<any> => {
	let listOfPOAPLinks;
	try {
		const response = await axios.get(attachment.url);
		listOfPOAPLinks = response.data.split('\n');
	} catch (e) {
		console.error(e);
	}
	for (let i = 0; i < listOfParticipants.length; i++) {
		const participantMember: GuildMember = await guild.members.fetch(listOfParticipants[i].id);
		await participantMember.send({ content: `Thank you for participating in BanklessDAO! Here is your POAP: ${listOfPOAPLinks[i]}` });
	}
};