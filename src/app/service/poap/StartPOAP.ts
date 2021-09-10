import {
	AwaitMessagesOptions,
	Collection as DiscordCollection, DMChannel, EmbedField,
	Guild, GuildChannel,
	GuildMember, Message, MessageEmbedOptions,
	StageChannel,
	VoiceChannel,
} from 'discord.js';
import { Collection, Cursor, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';
import { updateUserForPOAP } from '../../events/poap/AddUserForEvent';
import ServiceUtils from '../../utils/ServiceUtils';
import EarlyTermination from '../../errors/EarlyTermination';
import POAPUtils from '../../utils/POAPUtils';

export default async (guildMember: GuildMember, event?: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	await POAPUtils.validateUserAccess(guildMember, db);
	await POAPUtils.validateEvent(guildMember, event);
	
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const activeSettingsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
		discordUserId: guildMember.id,
		isActive: true,
	});
	const activeSettings: POAPSettings = await activeSettingsCursor.next();
	if (activeSettings != null) {
		console.log('unable to start due to active event');
		await guildMember.send({ content: 'An event is already active.' });
		throw new ValidationError(`Please end the active event \`${activeSettings.voiceChannelName}\`.`);
	}
	
	const voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel> = ServiceUtils.getAllVoiceChannels(guildMember);
	const message: Message = await guildMember.send({ embeds: [generateVoiceChannelEmbedMessage(voiceChannels)] });
	const channelChoice: GuildChannel = await askUserForChannel(guildMember, message, voiceChannels);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	});

	if (poapSettingsDoc !== null && poapSettingsDoc.isActive) {
		console.log('unable to start due to active event');
		await guildMember.send({ content: 'Event is already active.' });
		throw new ValidationError(`\`${channelChoice.name}\` is already active. Please reach out to <@${poapSettingsDoc.discordUserId}> to end event.`);
	}

	if (poapSettingsDoc == null) {
		console.log(`setting up first time poap configuration for ${guildMember.user.tag}`);
		await setupPoapSetting(guildMember, poapSettingsDB, channelChoice, event);
	}

	await clearPOAPParticipants(db, channelChoice);
	const currentDateStr = (new Date()).toISOString();
	await poapSettingsDB.updateOne({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	}, {
		$set: {
			isActive: true,
			startTime: currentDateStr,
			discordUserId: guildMember.user.id,
			event: event,
		},
	});
	await storePresentMembers(guildMember.guild, db, channelChoice);
	return guildMember.send({ content: `POAP tracking started for \`${channelChoice.name}\`.` });
};

export const setupPoapSetting = async (guildMember: GuildMember, poapSettingsDB: Collection, guildChannel: GuildChannel, event?: string): Promise<POAPSettings> => {
	const currentDateStr = (new Date()).toISOString();
	const poapSetting = {
		event: event,
		isActive: true,
		startTime: currentDateStr,
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
	console.log(`attempting to delete all previous participants for ${guildChannel.guild.name} on channel: ${guildChannel.name}`);
	const poapParticipantsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	await poapParticipantsDB.deleteMany({
		voiceChannelId: guildChannel.id,
		discordServerId: guildChannel.guild.id,
	});
	console.log('removed all previous participants.');
};

export const storePresentMembers = async (guild: Guild, db: Db, channel: GuildChannel): Promise<any> => {
	try {
		channel.members.forEach((member: GuildMember) => {
			updateUserForPOAP(member, db, channel, true);
		});
	} catch (e) {
		console.error(e);
	}
};

export const generateVoiceChannelEmbedMessage = (voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>): MessageEmbedOptions => {
	const fields: EmbedField[] = [];
	let i = 1;
	for (const channel of voiceChannels.values()) {
		fields.push({
			name: channel.name,
			value: `${i}`,
			inline: true,
		});
		i++;
	}
	return {
		title: 'Available Voice Channels',
		description: 'For which voice channel would you like to start POAP tracking? Please reply with a number.',
		fields: fields,
	};
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

