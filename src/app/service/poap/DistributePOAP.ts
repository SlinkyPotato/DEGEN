import { AwaitMessagesOptions, DMChannel, GuildMember, Message, MessageAttachment } from 'discord.js';
import axios from 'axios';
import POAPUtils, { FailedPOAPAttendee, POAPFileParticipant } from '../../utils/POAPUtils';
import ValidationError from '../../errors/ValidationError';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { CommandContext } from 'slash-create';
import { LogUtils } from '../../utils/Log';

export default async (ctx: CommandContext, guildMember: GuildMember, event?: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	await POAPUtils.validateEvent(guildMember, event);
	
	const participantsList: POAPFileParticipant[] = await askForParticipantsList(guildMember);
	await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
	const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
	const failedPOAPsList: FailedPOAPAttendee[] = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, linksMessageAttachment, event);
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
		// remove first and last object
		participantsList.shift();
		participantsList.pop();
	} catch (e) {
		LogUtils.logError('failed to ask for participants list', e);
		await guildMember.send({ content: 'Invalid attachment. Please try the command again.' });
		throw new ValidationError('Please try again.');
	}
	return participantsList;
};

export const askForLinksMessageAttachment = async (guildMember: GuildMember): Promise<MessageAttachment> => {
	const sendOutPOAPReplyMessage = await guildMember.send({ content: 'Please upload links.txt file from POAP.' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	return (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
};