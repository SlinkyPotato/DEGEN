import { GuildMember, VoiceState } from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../../service/constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import { POAPParticipant } from '../../types/poap/POAPParticipant';

export default async (oldState: VoiceState, newState: VoiceState, event: { id: string, value: string }): Promise<any> => {
	if (oldState.channelId === newState.channelId) {
		// user did not change channels
		return;
	}
	
	if (newState.channelId !== event.id) {
		// user did not join community stage
		return;
	}
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	
	if (!await isPOAPTrackingActive(db, event.value).catch(console.error)) {
		return;
	}
	
	await storeUserForPOAP(newState.member, db, event.value).catch(console.error);
	return dbInstance.close();
};

export const isPOAPTrackingActive = async (db: Db, eventValue: string): Promise<boolean> => {
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const result: POAPSettings = await poapSettingsDB.findOne({
		event: eventValue,
	});
	
	return !(result === null || !result.isActive);
};

export const storeUserForPOAP = async (guildMember: GuildMember, db: Db, eventValue: string): Promise<void> => {
	const poapParticipantsDb: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const currentDateStr = (new Date()).toISOString();
	
	const findResult: POAPParticipant = await poapParticipantsDb.findOne({
		event: eventValue,
		discordId: guildMember.user.id,
	});
	
	if (findResult !== null && findResult.discordId === guildMember.user.id) {
		console.log(`${guildMember.user.tag} | already present in ${eventValue}`);
		return;
	}
	
	const result: InsertOneWriteOpResult<POAPParticipant> = await poapParticipantsDb.insertOne({
		event: eventValue,
		discordId: guildMember.user.id,
		discordTag: guildMember.user.tag,
		startTime: currentDateStr,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapParticipant');
	}
	console.log(`${guildMember.user.tag} | joined ${eventValue}`);
};
