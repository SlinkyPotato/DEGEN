import {
	AwaitMessagesOptions,
	Collection as DiscordCollection, DMChannel, EmbedField,
	Guild,
	GuildMember, Message, MessageEmbedOptions,
	StageChannel,
	VoiceChannel,
} from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';
import poapEvents from '../constants/poapEvents';
import channelIds from '../constants/channelIds';
import { updateUserForPOAP } from '../../events/poap/AddUserForEvent';
import ServiceUtils from '../../utils/ServiceUtils';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel> = ServiceUtils.getAllVoiceChannels(guildMember);
	const message: Message = await guildMember.send({ embeds: [generateVoiceChannelEmbedMessage(voiceChannels)] });
	const channelChoice = await askUserForChannelNumber(guildMember, message, voiceChannels);
	if (channelChoice == null) {
		return;
	}
	return;
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		event: event,
	});

	if (poapSettingsDoc !== null && poapSettingsDoc.isActive) {
		console.log('unable to start due to active event');
		throw new ValidationError(`\`${event}\` is already active by <@${poapSettingsDoc.poapManagerId}>.`);
	}

	if (poapSettingsDoc == null) {
		console.log(`setting up first time poap configuration for ${guildMember.user.tag}`);
		await setupPoapSetting(guildMember, poapSettingsDB, event);
	}

	await clearPOAPParticipants(db, event);
	const currentDateStr = (new Date()).toISOString();
	await poapSettingsDB.updateOne({
		event: event,
	}, {
		$set: {
			isActive: true,
			startTime: currentDateStr,
			poapManagerId: guildMember.user.id,
			poapManagerTag: guildMember.user.tag,
		},
	});
	await storePresentMembers(guildMember.guild, event, db);
	return guildMember.send({ content: `POAP tracking started for \`${event}\`.` });
};

export const setupPoapSetting = async (guildMember: GuildMember, poapSettingsDB: Collection, occasion: string): Promise<POAPSettings> => {
	const currentDateStr = (new Date()).toISOString();
	const result: InsertOneWriteOpResult<POAPSettings> = await poapSettingsDB.insertOne({
		event: occasion,
		isActive: true,
		startTime: currentDateStr,
		poapManagerId: guildMember.user.id,
		poapManagerTag: guildMember.user.tag,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapSettings');
	}
	return result.ops.pop();
};

export const clearPOAPParticipants = async (db: Db, event: string): Promise<void> => {
	console.log(`attempting to delete all previous participants for event: ${event}...`);
	const poapParticipantsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	await poapParticipantsDB.deleteMany({
		event: event,
	});
	console.log('removed all previous participants.');
};

export const storePresentMembers = async (guild: Guild, event: string, db: Db): Promise<any> => {
	let channelId;
	switch (event) {
	case poapEvents.DEV_GUILD:
		channelId = channelIds.DEV_WORKROOM;
		break;
	case poapEvents.COMMUNITY_CALL:
		channelId = channelIds.COMMUNITY_CALLS_STAGE;
		break;
	case poapEvents.WRITERS_GUILD:
		channelId = channelIds.WRITERS_ROOM;
		break;
	default:
		throw new ValidationError('Event not available.');
	}
	try {
		const voiceChannel: VoiceChannel = await guild.channels.fetch(channelId) as VoiceChannel;
		voiceChannel.members.forEach((member: GuildMember) => {
			updateUserForPOAP(member, db, event, true);
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

export const askUserForChannelNumber = async (guildMember: GuildMember, dmMessage: Message, voiceChannels: DiscordCollection<string, VoiceChannel | StageChannel>): Promise<number | null> => {
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
			await guildMember.send({ content: 'Ok no problem!' });
			return;
		}
		channelNumber = Number(channelChoice);
		if (isNaN(channelNumber) || channelNumber <= 0 || channelNumber > voiceChannels.size) {
			await guildMember.send({ content: 'Please enter a valid channel number or `no` to exit.' });
		} else {
			break;
		}
	} while (channelChoice != 'no');
	return channelNumber;
};

