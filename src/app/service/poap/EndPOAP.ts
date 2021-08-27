import { AwaitMessagesOptions, DMChannel, Guild, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Cursor, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import axios from 'axios';
import { POAPSettings } from '../../types/poap/POAPSettings';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		event: event,
		isActive: true,
	});

	if (poapSettingsDoc == null) {
		throw new ValidationError(`\`${event}\` is not active.`);
	}

	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne(poapSettingsDoc, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError(`\`${event}\` is not active.`);
	}
	console.log(`event ${event} ended`);

	const poapGuildManager: GuildMember = await guildMember.guild.members.fetch(poapSettingsDoc.poapManagerId);

	const listOfParticipants = await getListOfParticipants(poapGuildManager, db, event);
	const bufferFile = await getBufferFromParticipants(listOfParticipants, event);
	const currentDate = (new Date()).toISOString();
	await poapGuildManager.send({
		content: `Total Participants: \`${listOfParticipants.length} participants\`\n Event: \`${event}\`\n Date: \`${currentDate} UTC\`.`,
		files: [{ name: `${event}_${listOfParticipants.length}_participants.txt`, attachment: bufferFile }],
	});

	if (poapGuildManager.id !== guildMember.user.id) {
		return guildMember.send({ content: `Previous event ended for <@${poapGuildManager.id}>.` });
	}

	const sendOutPOAPReplyMessage = await poapGuildManager.send({ content: 'Would you like me send out POAP links to participants? `(yes/no)`' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await poapGuildManager.send({ content: 'Ok! Please upload the POAP links.txt file.' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		await sendOutPOAPLinks(poapGuildManager, listOfParticipants, poapLinksFile);
	} else {
		await poapGuildManager.send({ content: 'You got it!' });
	}
	return dbInstance.close();
};

export const getListOfParticipants = async (guildMember: GuildMember, db: Db, event: string)
	: Promise<{id: string, tag: string, duration: number}[]> => {
	const poapParticipants: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const resultCursor: Cursor<POAPParticipant> = await poapParticipants.find({
		event: event,
	});

	if ((await resultCursor.count()) === 0) {
		console.log(`no participants found for ${event}`);
		return [];
	}

	let endTime: number = Date.now();
	const participants = [];
	await resultCursor.forEach((participant: POAPParticipant) => {
		if (participant.endTime) {
			endTime = new Date(participant.endTime).getTime();
		}
		let durationInMinutes: number = (endTime - (new Date(participant.startTime)).getTime());
		durationInMinutes = (durationInMinutes <= 0) ? 0 : durationInMinutes / (1000 * 60);
		if (durationInMinutes >= 5) {
			participants.push({ id: participant.discordId, tag: participant.discordTag, duration: durationInMinutes });
		}
	});

	return participants;
};

export const getBufferFromParticipants = async (participants: {id: string, tag: string, duration: number}[], event: string): Promise<Buffer> => {
	if (participants.length === 0) {
		console.log(`no participants found for ${event}`);
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = 'discordHandle,durationInMinutes\n';
	participants.forEach((participant: {id: string, tag: string, duration: number}) => {
		participantsStr += `${participant.tag},${participant.duration}` + '\n';
	});

	return Buffer.from(participantsStr, 'utf-8');
};

export const sendOutPOAPLinks = async (guildMember: GuildMember, listOfParticipants: any[], attachment: MessageAttachment): Promise<any> => {
	let listOfPOAPLinks;
	try {
		const response = await axios.get(attachment.url);
		listOfPOAPLinks = response.data.split('\n');
	} catch (e) {
		console.error(e);
		return guildMember.send({ content: 'Could not process the links.txt file. Please make sure the file that is uploaded has every URL on a new line.' });
	}
	for (let i = 0; i < listOfParticipants.length; i++) {
		const participantMember: GuildMember = await guildMember.guild.members.fetch(listOfParticipants[i].id);
		await participantMember.send({ content: `Thank you for participating in BanklessDAO! Here is your POAP: ${listOfPOAPLinks[i]}` });
	}
};