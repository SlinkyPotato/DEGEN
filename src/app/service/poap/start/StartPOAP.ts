import {
	AwaitMessagesOptions,
	Collection as DiscordCollection,
	DMChannel,
	EmbedField,
	GuildChannel,
	GuildMember,
	Message,
	MessageEmbedOptions,
	StageChannel, TextChannel,
	VoiceChannel,
} from 'discord.js';
import {
	MessageEmbedOptions as MessageEmbedOptionsSlash,
	EmbedField as EmbedFieldSlash,
} from 'slash-create';
import {
	Collection,
	Cursor,
	Db,
	FindAndModifyWriteOpResultObject,
} from 'mongodb';
import constants from '../../constants/constants';
import { POAPSettings } from '../../../types/poap/POAPSettings';
import ValidationError from '../../../errors/ValidationError';
import { updateUserForPOAP } from '../../../events/poap/AddUserForEvent';
import ServiceUtils from '../../../utils/ServiceUtils';
import EarlyTermination from '../../../errors/EarlyTermination';
import POAPUtils from '../../../utils/POAPUtils';
import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../../utils/Log';
import dayjs, { Dayjs } from 'dayjs';
import POAPService from '../POAPService';
import MongoDbUtils from '../../../utils/MongoDbUtils';
import StartTwitterFlow from './StartTwitterFlow';
import StartChannelFlow from './StartChannelFlow';

export default async (ctx: CommandContext, guildMember: GuildMember, platform: string, event: string, duration?: number): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try starting poap event within discord channel');
		return;
	}
	Log.debug('starting poap event...');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);

	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateEvent(event);
	duration = POAPUtils.validateDuration(duration);
	
	Log.debug('poap start validated');
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await StartTwitterFlow(ctx, guildMember, db, event, duration);
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
		throw new ValidationError(`Please end \`${activeSettings.voiceChannelName}\` event before starting a new event.`);
	}
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Hello! For which voice channel should the POAP event occur?');
	const voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel> = ServiceUtils.getAllVoiceChannels(guildMember);
	
	if (!isDmOn) {
		await StartChannelFlow(ctx, guildMember, db, event, duration, poapSettingsDB);
		return;
	}
	
	const message: Message = await guildMember.send({ embeds: generateVoiceChannelEmbedMessage(voiceChannels) as MessageEmbedOptions[] });
	await ctx.send({ content: 'Please check your DMs!', ephemeral: true });
	const channel: DMChannel = await message.channel.fetch() as DMChannel;
	const channelChoice: GuildChannel = await askUserForChannel(guildMember, channel, voiceChannels, true, ctx);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	});

	if (poapSettingsDoc !== null && poapSettingsDoc.isActive) {
		Log.info('unable to start due to active event');
		await guildMember.send({ content: 'Event is already active.' });
		throw new ValidationError(`\`${channelChoice.name}\` is already active. Please reach out to <@${poapSettingsDoc.discordUserId}> to end event.`);
	}
	
	await setActiveEventInDb(guildMember, db, channelChoice, event, duration);
	
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
	await guildMember.send({ content: 'Everything is set, catch you later!' });
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

export const generateVoiceChannelEmbedMessage = (
	voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>,
): MessageEmbedOptions[] | MessageEmbedOptionsSlash[] => {
	const embeds: MessageEmbedOptions[] | MessageEmbedOptionsSlash[] = [];
	let i = 1;
	let k = 1;
	let fields: EmbedField[] | EmbedFieldSlash[] = [];
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

export const askUserForChannel = async (
	guildMember: GuildMember,
	channel: TextChannel | DMChannel,
	voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>,
	isDmOn: boolean,
	ctx?: CommandContext,
): Promise<GuildChannel> => {
	Log.debug('asking poap organizer for channel');
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
		filter: m => m.author.id == guildMember.user.id,
	};
	let channelNumber: number;
	let channelChoice: string;
	do {
		try {
			channelChoice = (await channel.awaitMessages(replyOptions)).first().content;
		} catch (e) {
			LogUtils.logError('failed to capture channel', e);
			throw new ValidationError('Please enable view channel and send messages permission for this channel.');
		}
		if (channelChoice === 'no') {
			if (isDmOn) {
				await guildMember.send({ content: '👍' });
			}
			throw new EarlyTermination('Command terminated early.');
		}
		channelNumber = Number(channelChoice);
		if (isNaN(channelNumber) || channelNumber <= 0 || channelNumber > voiceChannels.size) {
			Log.warn('sent invalid channel number');
			const enterValidNumberMsg = 'Please enter a valid channel number or `no` to exit.';
			if (isDmOn) {
				await guildMember.send({ content: enterValidNumberMsg }).catch(Log.error);
			} else if (ctx) {
				await ctx.sendFollowUp(enterValidNumberMsg).catch(Log.error);
			}
		} else {
			break;
		}
	} while (channelChoice != 'no');
	
	let i = 1;
	for (const voiceChannel of voiceChannels.values()) {
		if (channelNumber === i) {
			Log.debug(`poap organizer selected channel ${voiceChannel.name}`);
			return voiceChannel;
		}
		i++;
	}
	Log.warn(`could not find voice channel for ${guildMember.user.tag}`);
};

export const setActiveEventInDb = async (guildMember: GuildMember, db: Db, channelChoice: GuildChannel, event: string, duration: number): Promise<void> => {
	Log.debug('starting update of poap settings process... ');
	await clearPOAPParticipants(db, channelChoice);
	const poapSettingsDB: Collection<POAPSettings> = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const currentDate: Dayjs = dayjs();
	const currentDateISO: string = currentDate.toISOString();
	const endDateISO: string = currentDate.add(duration, 'minute').toISOString();
	
	Log.debug('looking to find and update poap settings in db');
	const activeEventResult: FindAndModifyWriteOpResultObject<POAPSettings> = await poapSettingsDB.findOneAndReplace({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	}, {
		event: event,
		isActive: true,
		startTime: currentDateISO,
		endTime: endDateISO,
		discordUserId: guildMember.user.id,
		voiceChannelId: channelChoice.id,
		voiceChannelName: channelChoice.name,
		discordServerId: channelChoice.guild.id,
	}, {
		upsert: true,
		returnDocument: 'after',
	});
	
	if (activeEventResult.ok != 1) {
		Log.warn('failed to set poap setting as active for poap organizer');
		throw new ValidationError('I\'m sorry something is not working, can you try again?');
	}
	
	Log.debug(`found and updated poap settings for ${guildMember.user.tag}`);
	await storePresentMembers(db, channelChoice);
	POAPService.setupAutoEndForEvent(guildMember.client, activeEventResult.value, constants.PLATFORM_TYPE_DISCORD);
};