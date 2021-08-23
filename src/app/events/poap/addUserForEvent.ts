import { GuildMember, VoiceState } from 'discord.js';
import channelIds from '../../service/constants/channelIds';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../../service/constants/constants';
import poapEvents from '../../service/constants/poapEvents';
import { POAPSettings } from '../../types/poap/POAPSettings';
import { POAPParticipant } from '../../types/poap/POAPParticipant';

export default async (oldState: VoiceState, newState: VoiceState): Promise<any> => {
	if (oldState.channelId === newState.channelId) {
		// user did not change channels
		return;
	}
	
	if (newState.channelId !== channelIds.DEV_WORKROOM) {
		// user did not join community stage
		return;
	}
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	
	if (!await isPOAPTrackingActive(db).catch(console.error)) {
		return;
	}
	
	await storeUserForPOAP(newState.member, db).catch(console.error);
	return dbInstance.close();
};

export const isPOAPTrackingActive = async (db: Db): Promise<boolean> => {
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const result: POAPSettings = await poapSettingsDB.findOne({
		event: poapEvents.COMMUNITY_CALL,
	});
	
	return !(result === null || !result.isActive);
};

export const storeUserForPOAP = async (guildMember: GuildMember, db: Db): Promise<void> => {
	const poapParticipantsDb: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const currentDateStr = (new Date()).toISOString();
	
	const findResult: POAPParticipant = await poapParticipantsDb.findOne({
		event: poapEvents.COMMUNITY_CALL,
		discordId: guildMember.user.id,
	});
	
	if (findResult !== null && findResult.discordId === guildMember.user.id) {
		console.log(`${guildMember.user.tag} | already present in ${poapEvents.COMMUNITY_CALL}`);
		return;
	}
	
	const result: InsertOneWriteOpResult<POAPParticipant> = await poapParticipantsDb.insertOne({
		event: poapEvents.COMMUNITY_CALL,
		discordId: guildMember.user.id,
		discordTag: guildMember.user.tag,
		startTime: currentDateStr,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapParticipant');
	}
	console.log(`${guildMember.user.tag} | joined ${poapEvents.COMMUNITY_CALL}`);
};
