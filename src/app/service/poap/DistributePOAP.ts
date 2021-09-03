import { AwaitMessagesOptions, DMChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import axios from 'axios';
import { POAPSettings } from '../../types/poap/POAPSettings';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		event: event,
		isActive: false,
	});

	if (poapSettingsDoc == null) {
		throw new ValidationError(`\`${event}\` is active.`);
	}

	const poapGuildManager: GuildMember = await guildMember.guild.members.fetch(poapSettingsDoc.poapManagerId);

	const listOfParticipants = await getListOfParticipants(poapGuildManager, db, event);

	const sendOutPOAPReplyMessage = await poapGuildManager.send({ content: 'Please upload links.txt file.' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
	return sendOutPOAPLinks(poapGuildManager, listOfParticipants, poapLinksFile);
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
			participants.push({ id: participant.discordUserId, tag: participant.discordUserTag, duration: durationInMinutes });
		}
	});

	return participants;
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
		try {
			const participantMember: GuildMember = await guildMember.guild.members.fetch(listOfParticipants[i].id);
			console.log(`sending POAP for ${participantMember.user.tag}`);
			await participantMember.send({ content: `Thank you for participating in BanklessDAO! Here is your POAP: ${listOfPOAPLinks[i]}` }).catch(console.error);
		} catch (e) {
			console.log('user might have been banned');
		}
	}
};