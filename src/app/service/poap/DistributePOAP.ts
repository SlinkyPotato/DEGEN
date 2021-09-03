import { AwaitMessagesOptions, DMChannel, GuildMember, Message, MessageAttachment } from 'discord.js';
import { Collection, Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { POAPSettings } from '../../types/poap/POAPSettings';
import axios from 'axios';
import { POAPFileParticipant } from '../../utils/POAPUtils';

export default async (guildMember: GuildMember): Promise<any> => {
	
	await askForParticipantsList(guildMember);
	return;
	
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

	// const listOfParticipants = await getListOfParticipants(poapGuildManager, db, event);

	const sendOutPOAPReplyMessage = await poapGuildManager.send({ content: 'Please upload links.txt file.' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
	// return sendOutPOAPLinks(poapGuildManager, listOfParticipants, poapLinksFile);
};

export const askForParticipantsList = async (guildMember: GuildMember): Promise<POAPFileParticipant[]> => {
	const message: Message = await guildMember.send({ content: 'Please upload participants.csv file.' });
	const dmChannel: DMChannel = await message.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	let participantsList = [];
	try {
		const participantAttachment: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = fileResponse.data.split('\n').map(participant => {
			const values = participant.split(',');
			return {
				id: values[0],
				tag: values[1],
				duration: values[2],
			};
		});
		console.log(participantsList);
	} catch (e) {
		console.log(e);
		await guildMember.send({ content: 'Invalid attachment. Please try the command again.' });
	}
	return participantsList;
};