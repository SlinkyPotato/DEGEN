import { Guild, GuildMember, VoiceChannel } from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';
import poapEvents from '../constants/poapEvents';
import channelIds from '../constants/channelIds';
import { storeUserForPOAP } from '../../events/poap/addUserForEvent';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
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
	await guildMember.send({ content: `POAP tracking started for \`${event}\`.` });
	return dbInstance.close();
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
			storeUserForPOAP(member, db, event);
		});
	} catch (e) {
		console.error(e);
	}
};
