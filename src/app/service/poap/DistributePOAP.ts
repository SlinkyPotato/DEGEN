import { AwaitMessagesOptions, DMChannel, GuildMember, Message, MessageAttachment } from 'discord.js';
import axios from 'axios';
import POAPUtils, { POAPFileParticipant, TwitterPOAPFileParticipant } from '../../utils/POAPUtils';
import ValidationError from '../../errors/ValidationError';
import { Db } from 'mongodb';
import constants from '../constants/constants';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import { Buffer } from 'buffer';
import MongoDbUtils from '../../utils/MongoDbUtils';
import ServiceUtils from '../../utils/ServiceUtils';

export default async (ctx: CommandContext, guildMember: GuildMember, event: string, platform: string): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try ending poap event within discord channel');
		return;
	}
	Log.debug('starting poap distribution...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	
	await ServiceUtils.tryDMUser(guildMember, 'Hi, just need a moment to stretch before I run off sending POAPS...');
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = await askForParticipantsList(guildMember);
	const numberOfParticipants: number = participantsList.length;
	
	if (numberOfParticipants <= 0) {
		await ctx.send('Hmm there doesn\'t seem to be any participants');
		return;
	}

	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await distributeTwitterFlow();
		return;
	}

	participantsList = participantsList as POAPFileParticipant[];
	
	if (!participantsList[0].discordUserId) {
		await guildMember.send({ content: 'parsing failed, please try a csv file with headers discordUserId,discordUserTag,durationInMinutes' });
		throw Error('failed to parse');
	}

	let failedPOAPsList: POAPFileParticipant[];
	if (!participantsList[0].poapLink) {
		const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(guildMember, linksMessageAttachment);
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event, listOfPOAPLinks);
	} else {
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event);
	}
	const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(failedPOAPsList);
	await guildMember.send({
		embeds: [
			{
				title: 'POAPs Distribution Results',
				fields: [
					{ name: 'Attempted to Send', value: `${numberOfParticipants}`, inline: true },
					{ name: 'Successfully Sent', value: `${numberOfParticipants - failedPOAPsList.length}`, inline: true },
					{ name: 'Failed to Send', value: `${failedPOAPsList.length}`, inline: true },
				],
			},
		],
		files: [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }],
	});
	if (failedPOAPsList.length <= 0) {
		Log.debug('all poap successfully delivered');
		return;
	}
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_DISCORD, ctx);
	Log.debug('poap distribution complete');
	return;
};

export const askForParticipantsList = async (guildMember: GuildMember): Promise<POAPFileParticipant[] | TwitterPOAPFileParticipant[]> => {
	const message: Message = await guildMember.send({ content: 'Please upload .csv file with header discordUserId,discordUserTag and either durationInMinutes or poapLink. POAPs will be distributed to these degens.' });
	const dmChannel: DMChannel = await message.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = [];
	try {
		const participantAttachment: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = ServiceUtils.parseCSVFile(fileResponse.data);
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

const distributeTwitterFlow = async () => {
	return null;
};