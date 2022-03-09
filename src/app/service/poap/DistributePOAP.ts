import {
	GuildMember,
	Message,
	MessageAttachment,
	TextChannel,
} from 'discord.js';
import axios from 'axios';
import POAPUtils, { POAPFileParticipant, TwitterPOAPFileParticipant } from '../../utils/POAPUtils';
import ValidationError from '../../errors/ValidationError';
import {
	Db,
} from 'mongodb';
import constants from '../constants/constants';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';
import ServiceUtils from '../../utils/ServiceUtils';
import { POAPDistributionResults } from '../../types/poap/POAPDistributionResults';

export default async (ctx: CommandContext, guildMember: GuildMember, event: string, platform: string, allUsers: boolean): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try poap distribution within discord channel');
		return;
	}
	
	Log.debug('starting poap distribution for discord...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
		
	await ctx.defer(true);
	await ctx.send({ content: '⚠ Please make sure this is a private channel. I can help you distribute POAPs but anyone who has access to this channel can see private information! ⚠', ephemeral: true });
	
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[];
	if (allUsers) {
		participantsList = await ServiceUtils.getAllMembersAsPOAPFilePartcipant(guildMember.guild);
	} else {
		participantsList = await askForParticipantsList(guildMember, platform, ctx);
	}
	const numberOfParticipants: number = participantsList.length;
	
	if (numberOfParticipants <= 0) {
		throw new ValidationError('Hmm there doesn\'t seem to be any participants.');
	}
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await distributeTwitterFlow(ctx, guildMember, participantsList as TwitterPOAPFileParticipant[], event);
		return;
	}
	
	participantsList = participantsList as POAPFileParticipant[];
	
	if (!participantsList[0].discordUserId) {
		const msg = 'Parsing failed, please try a csv file with headers `discordUserId`.';
		await ctx.send({ content: msg, ephemeral: true });
		throw Error('failed to parse');
	}

	let distributionResults: POAPDistributionResults;
	if (!participantsList[0].poapLink) {
		Log.debug('poapLink field not found, will ask user for POAP links');
		const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, numberOfParticipants, ctx);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
		distributionResults = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event, listOfPOAPLinks);
	} else {
		Log.debug('poapLink field found, will attempt to send out POAPs');
		distributionResults = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event);
	}
	if (distributionResults.didNotSendList.length > 0) {
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, distributionResults, event, constants.PLATFORM_TYPE_DISCORD);
	}
	await POAPUtils.handleDistributionResults(guildMember, distributionResults, null, ctx);
	
	Log.debug('poap distribution complete');
};

export const askForParticipantsList = async (guildMember: GuildMember, platform: string, ctx: CommandContext): Promise<POAPFileParticipant[] | TwitterPOAPFileParticipant[]> => {
	Log.debug('preparing to ask for participants list csv file');
	let csvPrompt = '';
	if (platform == constants.PLATFORM_TYPE_DISCORD) {
		csvPrompt = 'Please upload distribution file with header containing `discordUserId`.';
	} else if (platform == constants.PLATFORM_TYPE_TWITTER) {
		csvPrompt = 'Please upload distribution file with header containing `twitterUserId`.';
	}
	
	await ctx.send({ content: csvPrompt, ephemeral: true });
	
	Log.debug(`message: '${csvPrompt}' send to user`);
	
	const contextChannel: TextChannel = await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
	
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = [];
	try {
		const message: Message | undefined = (await contextChannel.awaitMessages({
			max: 1,
			time: 180_000,
			errors: ['time'],
			filter: m => m.author.id == guildMember.id && m.attachments.size >= 1,
		})).first();
		if (message == null) {
			throw new ValidationError('Invalid message');
		}
		const participantAttachment: MessageAttachment | undefined = message.attachments.first();
		
		if (participantAttachment == null) {
			throw new ValidationError('Invalid attachment');
		}
		
		Log.debug(`found participants file: ${participantAttachment.url}`);
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = ServiceUtils.parseCSVFile(fileResponse.data);
		await message.delete();
		if ((participantsList as POAPFileParticipant[])[0].discordUserId == null) {
			if ((participantsList as TwitterPOAPFileParticipant[])[0].twitterUserId == null) {
				throw new Error('missing ID');
			}
		}
	} catch (e) {
		LogUtils.logError('failed to ask for participants list', e);
		throw new ValidationError('Invalid attachment. Session ended. Please try the command again.');
	}
	return participantsList;
};

const distributeTwitterFlow = async (ctx: CommandContext, guildMember: GuildMember, participantsList: TwitterPOAPFileParticipant[], event: string) => {
	Log.debug('distributing POAP for Twitter');
	const numberOfParticipants: number = participantsList.length;
	if (!participantsList[0].twitterUserId) {
		const msg = 'parsing failed, please try a csv file with headers twitterUserId';
		await ctx.send({ content: msg, ephemeral: true });
		throw Error('failed to parse');
	}

	let distributionResults: POAPDistributionResults;
	if (!participantsList[0].poapLink) {
		const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, numberOfParticipants, ctx);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
		distributionResults = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event, listOfPOAPLinks);
	} else {
		distributionResults = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event);
	}
	if (distributionResults.didNotSendList.length > 0) {
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, distributionResults, event, constants.PLATFORM_TYPE_TWITTER);
	}
	await POAPUtils.handleDistributionResults(guildMember, distributionResults, null, ctx);
	
	Log.debug('poap distribution complete');
};
