import {
	AwaitMessagesOptions,
	Collection as DiscordCollection, DMChannel, EmbedField,
	GuildChannel,
	GuildMember, Message, MessageEmbedOptions,
	StageChannel,
	VoiceChannel,
} from 'discord.js';
import {
	Collection,
	Cursor,
	Db,
	FindAndModifyWriteOpResultObject,
	InsertOneWriteOpResult,
	MongoError,
} from 'mongodb';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';
import { updateUserForPOAP } from '../../events/poap/AddUserForEvent';
import ServiceUtils from '../../utils/ServiceUtils';
import EarlyTermination from '../../errors/EarlyTermination';
import POAPUtils from '../../utils/POAPUtils';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import dayjs, { Dayjs } from 'dayjs';
import POAPService from './POAPService';
import MongoDbUtils from '../../utils/MongoDbUtils';
import VerifyTwitter from '../account/VerifyTwitter';
import { SpaceV2LookupResult, TwitterApi } from 'twitter-api-v2';
import apiKeys from '../constants/apiKeys';
import { POAPTwitterSettings } from '../../types/poap/POAPTwitterSettings';
import { POAPTwitterParticipants } from '../../types/poap/POAPTwitterParticipants';

export default async (ctx: CommandContext, guildMember: GuildMember, platform: string, event: string, duration?: number): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try starting poap event within discord channel');
		return;
	}
	Log.debug('starting poap event...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);

	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	POAPUtils.validateDuration(duration);
	
	Log.debug('poap start validated');
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await startTwitterPOAPFlow(ctx, guildMember, db, event, duration);
		return;
	}
	
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const activeSettingsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	const activeSettings: POAPSettings = await activeSettingsCursor.next();
	if (activeSettings != null) {
		Log.debug('unable to start due to active event');
		throw new ValidationError(`Please end the active event \`${activeSettings.voiceChannelName}\`.`);
	}
	
	await ServiceUtils.tryDMUser(guildMember, 'Hello! For which voice channel should the POAP event occur?');
	const voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel> = ServiceUtils.getAllVoiceChannels(guildMember);
	const message: Message = await guildMember.send({ embeds: generateVoiceChannelEmbedMessage(voiceChannels) });
	await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
	const channelChoice: GuildChannel = await askUserForChannel(guildMember, message, voiceChannels);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	});

	if (poapSettingsDoc !== null && poapSettingsDoc.isActive) {
		Log.info('unable to start due to active event');
		await guildMember.send({ content: 'Event is already active.' });
		throw new ValidationError(`\`${channelChoice.name}\` is already active. Please reach out to <@${poapSettingsDoc.discordUserId}> to end event.`);
	}
	
	duration = await POAPUtils.askForDuration(guildMember, duration);
	const currentDate: Dayjs = dayjs();
	const currentDateISO: string = currentDate.toISOString();
	const endDateISO: string = currentDate.add(duration, 'minute').toISOString();
	
	if (poapSettingsDoc == null) {
		Log.debug(`setting up first time poap configuration for ${guildMember.user.tag}`);
		await setupPoapSetting(guildMember, poapSettingsDB, channelChoice, currentDateISO, endDateISO, event);
	} else {
		Log.debug(`existing poapSettings found for ${guildMember.user.tag}`);
	}
	
	await clearPOAPParticipants(db, channelChoice);
	
	const activeEvent: FindAndModifyWriteOpResultObject<POAPSettings> = await poapSettingsDB.findOneAndUpdate({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	}, {
		$set: {
			isActive: true,
			startTime: currentDateISO,
			endTime: endDateISO,
			discordUserId: guildMember.user.id,
			event: event,
		},
	}, {
		returnDocument: 'after',
	});
	
	await storePresentMembers(db, channelChoice);
	
	POAPService.setupAutoEndForEvent(guildMember.client, activeEvent.value, constants.PLATFORM_TYPE_DISCORD);
	
	await guildMember.send({
		embeds: [
			{
				title: 'Event Started',
				fields: [
					{ name: 'Event', value: `${event == null ? '-' : event} `, inline: true },
					{ name: 'Organizer', value: `${guildMember.user.tag} `, inline: true },
					{ name: 'Discord Server', value: `${guildMember.guild.name} `, inline: true },
					{ name: 'Location', value: `${channelChoice.name} `, inline: true },
					{ name: 'Platform', value: `${platform}`, inline: true },
					{ name: 'Duration', value: `${duration} minutes`, inline: true },
				],
			},
		],
	});
	return;
};

export const setupPoapSetting = async (
	guildMember: GuildMember, poapSettingsDB: Collection, guildChannel: GuildChannel, startDateISO: string,
	endDateISO: string, event?: string,
): Promise<POAPSettings> => {
	const poapSetting = {
		event: event,
		isActive: true,
		startTime: startDateISO,
		endTime: endDateISO,
		discordUserId: guildMember.user.id.toString(),
		voiceChannelId: guildChannel.id.toString(),
		voiceChannelName: guildChannel.name.toString(),
		discordServerId: guildChannel.guild.id.toString(),
	};
	const result: InsertOneWriteOpResult<POAPSettings> = await poapSettingsDB.insertOne(poapSetting);
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapSettings');
	}
	return result.ops.pop();
};

export const clearPOAPParticipants = async (db: Db, guildChannel: GuildChannel): Promise<void> => {
	Log.debug(`attempting to delete all previous participants for ${guildChannel.guild.name} on channel: ${guildChannel.name}`);
	const poapParticipantsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	await poapParticipantsDB.deleteMany({
		voiceChannelId: guildChannel.id,
		discordServerId: guildChannel.guild.id,
	});
	Log.debug('removed all previous participants.', {
		indexMeta: true,
		meta: {
			guildId: guildChannel.guild.id,
			channelId: guildChannel.id,
		},
	});
};

export const storePresentMembers = async (db: Db, channel: GuildChannel): Promise<any> => {
	try {
		channel.members.forEach((member: GuildMember) => {
			updateUserForPOAP(member, db, channel, true);
		});
	} catch (e) {
		LogUtils.logError('failed to store present members', e);
	}
};

export const generateVoiceChannelEmbedMessage = (voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>): MessageEmbedOptions[] => {
	const embeds: MessageEmbedOptions[] = [];
	let i = 1;
	let k = 1;
	let fields: EmbedField[] = [];
	for (const channel of voiceChannels.values()) {
		if (k < 26) {
			fields.push({
				name: channel.name,
				value: `${i}`,
				inline: true,
			});
			k++;
		} else {
			embeds.push({
				title: 'Available Voice Channels',
				description: 'For which voice channel would you like to start POAP tracking? Please reply with a number.',
				fields: fields,
			});
			k = 0;
			fields = [{
				name: channel.name,
				value: `${i}`,
				inline: true,
			}];
		}
		i++;
	}
	if (fields.length >= 1) {
		embeds.push({
			title: 'Available Voice Channels',
			description: 'For which voice channel would you like to start POAP tracking? Please reply with a number.',
			fields: fields,
		});
	}
	return embeds;
};

export const askUserForChannel = async (guildMember: GuildMember, dmMessage: Message, voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>): Promise<GuildChannel> => {
	const dmChannel: DMChannel = await dmMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	let channelNumber: number;
	let channelChoice: string;
	do {
		channelChoice = (await dmChannel.awaitMessages(replyOptions)).first().content;
		if (channelChoice === 'no') {
			await guildMember.send({ content: '👍' });
			throw new EarlyTermination('Command terminated early.');
		}
		channelNumber = Number(channelChoice);
		if (isNaN(channelNumber) || channelNumber <= 0 || channelNumber > voiceChannels.size) {
			await guildMember.send({ content: 'Please enter a valid channel number or `no` to exit.' });
		} else {
			break;
		}
	} while (channelChoice != 'no');
	
	let i = 1;
	for (const voiceChannel of voiceChannels.values()) {
		if (channelNumber === i) {
			return voiceChannel;
		}
		i++;
	}
};

const startTwitterPOAPFlow = async (ctx: CommandContext, guildMember: GuildMember, db: Db, event: string, duration?: number): Promise<any> => {
	Log.debug('starting twitter poap flow...');
	const { twitterUser } = await VerifyTwitter(guildMember);
	const twitterClientV2: TwitterApi = new TwitterApi(apiKeys.twitterBearerToken);
	await ServiceUtils.tryDMUser(guildMember, 'Oh yea, time for a POAP event!...');

	let twitterSpaceResult: SpaceV2LookupResult;
	try {
		twitterSpaceResult = await twitterClientV2.v2.spacesByCreators(twitterUser.id_str);
	} catch (e) {
		LogUtils.logError('failed trying to get twitter spaces', e);
	}

	if (twitterSpaceResult.meta.result_count == 0 || twitterSpaceResult.data == null || twitterSpaceResult.data[0]['state'] != 'live') {
		Log.warn('Twitter space result is not live');
		await guildMember.send({ content: 'Uh-oh, please start twitter spaces before starting POAP event. If you have already started it, please wait a minute or two before trying again.' });
		await ctx.send('Nothing to see here, carry on 😅... ');
		return;
	}
	
	const twitterSpaceId: string = twitterSpaceResult.data[0]['id'];
	Log.debug(`twitter spaces event active: ${twitterSpaceId}`);
	await ctx.send({ content: `Something really special is starting...:bird: https://twitter.com/i/spaces/${twitterSpaceId}` });
	
	const poapTwitterSettings: Collection<POAPTwitterSettings> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
	const activeSettings: POAPTwitterSettings = await poapTwitterSettings.findOne({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeSettings != null) {
		Log.debug('unable to start twitter event due to active event');
		await guildMember.send('Looks like you have already started you POAP twitter space!');
		throw new ValidationError('Ha ha.. just kidding...');
	}
	duration = await POAPUtils.askForDuration(guildMember, duration);
	
	Log.debug('setting up active twitter event in db');
	const currentDate: Dayjs = dayjs();
	const endTimeISO: string = currentDate.add(duration, 'minute').toISOString();
	const twitterSettingsResult: FindAndModifyWriteOpResultObject<POAPTwitterSettings> = await poapTwitterSettings.findOneAndReplace({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
	}, {
		isActive: true,
		event: event,
		startTime: currentDate.toISOString(),
		endTime: endTimeISO,
		discordUserId: guildMember.id,
		discordUserTag: guildMember.user.tag,
		discordServerId: guildMember.guild.id,
		twitterUserId: twitterUser.id_str,
		twitterSpaceId: twitterSpaceId,
	}, {
		upsert: true,
		returnDocument: 'after',
	});
	
	if (twitterSettingsResult.ok != 1) {
		Log.warn('failed to insert twitter settings active event in db for poap organizer');
		throw new ValidationError('I\'m sorry something is not working, can you try again?');
	}
	
	Log.debug(`twitter poap event stored in db and set to active for userID: ${guildMember.id}, discordServerId: ${guildMember.guild.id}`);
	
	POAPService.setupAutoEndForEvent(guildMember.client, twitterSettingsResult.value, constants.PLATFORM_TYPE_TWITTER);
	const claimURL = `${apiKeys.twitterClaimPage}/${twitterSpaceId}`;
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Event Started',
				fields: [
					{ name: 'Event', value: `${event}`, inline: true },
					{ name: 'Organizer', value: `${guildMember.user.tag}`, inline: true },
					{ name: 'Discord Server', value: `${guildMember.guild.name}`, inline: true },
					{ name: 'Platform', value: 'Twitter', inline: true },
					{ name: 'Duration', value: `${duration} minutes`, inline: true },
					{ name: 'POAP Participation Claim Link', value: claimURL, inline: false },
				],
			},
		],
	});
	await guildMember.send({
		content: `POAP event setup! Please hand out ${claimURL} to your participants!`,
	});
	const poapTwitterParticipants: Collection<POAPTwitterParticipants> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_PARTICIPANTS);
	const result: FindAndModifyWriteOpResultObject<any> = await poapTwitterParticipants.findOneAndReplace({
		twitterSpaceId: twitterSpaceId,
		twitterUserId: twitterUser.id_str,
	}, {
		twitterSpaceId: twitterSpaceId,
		twitterUserId: twitterUser.id_str,
		dateOfTweet: currentDate.toISOString(),
	}, {
		upsert: true,
	});
	
	if (result.ok != 1) {
		await guildMember.send('One more thing, there was a problem setting counting you as a participants.. You just might miss the POAP, sorry.');
	}
	Log.debug('POAP Twitter spaces event event start message sent');
};
