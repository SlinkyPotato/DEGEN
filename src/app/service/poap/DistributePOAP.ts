import {
	DMChannel,
	GuildMember,
	MessageAttachment,
	TextChannel,
} from 'discord.js';
import axios from 'axios';
import POAPUtils, { POAPFileParticipant, TwitterPOAPFileParticipant } from '../../utils/POAPUtils';
import ValidationError from '../../errors/ValidationError';
import { Db } from 'mongodb';
import constants from '../constants/constants';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';
import ServiceUtils from '../../utils/ServiceUtils';

export default async (ctx: CommandContext, guildMember: GuildMember, event: string, platform: string): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try poap distribution within discord channel');
		return;
	}
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		if (ctx) {
			await ServiceUtils.sendOutErrorMessage(ctx, 'Twitter is temporarily turned off. Please reach out to support with any questions');
		}
		return;
	}
	
	Log.debug('starting poap distribution for discord...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Hello! I can help you distribute POAPS!');
	
	if (!isDmOn) {
		await ctx.sendFollowUp({ content: '⚠ Please make sure this is a private channel. I can help you distribute POAPs but anyone who has access to this channel can see private information! ⚠' });
	} else if (ctx) {
		await ctx.sendFollowUp({ content: 'Please check your DMs!', ephemeral: true });
	}
	
	const participantsList: POAPFileParticipant[] = await askForParticipantsList(guildMember, platform, isDmOn, ctx) as POAPFileParticipant[];
	const numberOfParticipants: number = participantsList.length;
	
	if (numberOfParticipants <= 0) {
		await ctx.send('Hmm there doesn\'t seem to be any participants.');
		return;
	}
	
	if (!participantsList[0].discordUserId) {
		const msg = 'parsing failed, please try a csv file with headers discordUserId';
		if (isDmOn) {
			await guildMember.send({ content: msg }).catch(Log.error);
		} else {
			await ctx.sendFollowUp({ content: msg });
		}
		throw Error('failed to parse');
	}

	let failedPOAPsList: POAPFileParticipant[];
	if (!participantsList[0].poapLink) {
		Log.debug('poapLink field not found, will ask user for POAP links');
		const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, isDmOn, numberOfParticipants, ctx);
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event, listOfPOAPLinks);
	} else {
		Log.debug('poapLink field found, will attempt to send out POAPs');
		failedPOAPsList = await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, event);
	}
	await POAPUtils.handleDistributionResults(ctx, isDmOn, guildMember, failedPOAPsList, numberOfParticipants);
	if (failedPOAPsList.length > 0) {
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_DISCORD, isDmOn, ctx);
	}
	Log.debug('poap distribution complete');
};

export const askForParticipantsList = async (guildMember: GuildMember, platform: string, isDmOn: boolean, ctx: CommandContext): Promise<POAPFileParticipant[] | TwitterPOAPFileParticipant[]> => {
	Log.debug('preparing to ask for participants list csv file');
	let csvPrompt: string;
	if (platform == constants.PLATFORM_TYPE_DISCORD) {
		csvPrompt = 'Please upload participants.csv file with header containing discordUserId. POAPs will be distributed to these degens.';
	} else if (platform == constants.PLATFORM_TYPE_TWITTER) {
		csvPrompt = 'Please upload participants.csv file with header containing twitterUserId. POAPs will be distributed to these degens.';
	}
	
	if (isDmOn) {
		await guildMember.send({ content: csvPrompt });
	} else {
		await ctx.sendFollowUp({ content: csvPrompt });
	}
	
	Log.debug(`message: '${csvPrompt}' send to user`);
	
	const contextChannel: DMChannel | TextChannel = isDmOn
		? await guildMember.createDM()
		: await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
	
	let participantsList: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = [];
	try {
		const participantAttachment: MessageAttachment = (await contextChannel.awaitMessages({
			max: 1,
			time: 180000,
			errors: ['time'],
		})).first().attachments.first();
		Log.debug(`found participants file: ${participantAttachment.url}`);
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = ServiceUtils.parseCSVFile(fileResponse.data);
		
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

// TODO: enable for twitter flow
// const distributeTwitterFlow = async (ctx: CommandContext, guildMember: GuildMember, participantsList: TwitterPOAPFileParticipant[], event: string) => {
// 	Log.debug('distributing POAP for Twitter');
// 	const numberOfParticipants: number = participantsList.length;
// 	if (!participantsList[0].twitterUserId) {
// 		await guildMember.send({ content: 'parsing failed, please try a csv file with headers twitterUserId' }).catch(Log.error);
// 		throw Error('failed to parse');
// 	}
//
// 	let failedPOAPsList: TwitterPOAPFileParticipant[];
// 	if (!participantsList[0].poapLink) {
// 		const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, false, numberOfParticipants, ctx);
// 		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
// 		failedPOAPsList = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event, listOfPOAPLinks);
// 	} else {
// 		failedPOAPsList = await POAPUtils.sendOutTwitterPoapLinks(participantsList, event);
// 	}
// 	if (!(await handleDistributionResults(guildMember, numberOfParticipants, failedPOAPsList))) {
// 		// await POAPUtils.setupFailedAttendeesDelivery(guildMember, failedPOAPsList, event, constants.PLATFORM_TYPE_TWITTER, ctx);
// 	}
// 	Log.debug('poap distribution finished');
// };
