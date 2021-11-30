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
		await ctx.send('Please try poap distribution within discord channel');
		return;
	}
	Log.debug('starting poap distribution...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Hello! I can help you distribute POAPS!');
	if (!isDmOn) {
		await ServiceUtils.sendOutErrorMessage(ctx, 'Distribution is temporarily turned off. Please reach out to support with any questions');
		return;
	}
	
	await ctx.send('Sent you a DM!');
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = await askForParticipantsList(guildMember, platform);
	const numberOfParticipants: number = participantsList.length;
	
	if (numberOfParticipants <= 0) {
		await ctx.send('Hmm there don\'t seem to be any participants');
		return;
	}

	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await distributeTwitterFlow(ctx, guildMember, participantsList as TwitterPOAPFileParticipant[], event);
		return;
	}

	Log.debug('starting discord distribution flow');
	participantsList = participantsList as POAPFileParticipant[];
	
	if (!participantsList[0].discordUserId) {
		await guildMember.send({ content: 'parsing failed, please try a csv file with headers discordUserId' });
		throw Error('failed to parse');
	}

	let failedPOAPsList: POAPFileParticipant[];
	if (!participantsList[0].poapLink) {
		const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(linksMessageAttachment);
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event, listOfPOAPLinks);
	} else {
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event);
	}
	const didDistributeAll = await handleDistributionResults(guildMember, numberOfParticipants, failedPOAPsList);
	if (!didDistributeAll) {
		// await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_DISCORD, ctx);
	}
	Log.debug('poap distribution complete');
};

export const askForParticipantsList = async (guildMember: GuildMember, platform: string): Promise<POAPFileParticipant[] | TwitterPOAPFileParticipant[]> => {
	let csvPrompt: string;
	if (platform == constants.PLATFORM_TYPE_DISCORD) {
		csvPrompt = 'Please upload participants.csv file with header containing discordUserId. POAPs will be distributed to these degens.';
	} else if (platform == constants.PLATFORM_TYPE_TWITTER) {
		csvPrompt = 'Please upload participants.csv file with header containing twitterUserId. POAPs will be distributed to these degens.';
	}
	const message: Message = await guildMember.send({ content: csvPrompt });
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
		
		if ((participantsList as POAPFileParticipant[])[0].discordUserId == null) {
			if ((participantsList as TwitterPOAPFileParticipant[])[0].twitterUserId == null) {
				throw new Error('missing ID');
			}
		}
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

const distributeTwitterFlow = async (ctx: CommandContext, guildMember: GuildMember, participantsList: TwitterPOAPFileParticipant[], event: string) => {
	Log.debug('distributing POAP for Twitter');
	const numberOfParticipants: number = participantsList.length;
	if (!participantsList[0].twitterUserId) {
		await guildMember.send({ content: 'parsing failed, please try a csv file with headers twitterUserId' });
		throw Error('failed to parse');
	}

	let failedPOAPsList: TwitterPOAPFileParticipant[];
	if (!participantsList[0].poapLink) {
		const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(linksMessageAttachment);
		failedPOAPsList = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event, listOfPOAPLinks);
	} else {
		failedPOAPsList = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event);
	}
	if (!(await handleDistributionResults(guildMember, numberOfParticipants, failedPOAPsList))) {
		// await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_TWITTER, ctx);
	}
	Log.debug('poap distribution finished');
};

const handleDistributionResults = async (guildMember: GuildMember, numberOfParticipants: number, failedPOAPsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[]): Promise<boolean> => {
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
		await guildMember.send({ content: 'All POAPs delivered!' });
		return true;
	}
	return false;
};