import { GuildMember, VoiceState } from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../../service/constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import { POAPParticipant } from '../../types/poap/POAPParticipant';

export default async (oldState: VoiceState, newState: VoiceState, event: { id: string, value: string }): Promise<any> => {
	if (!(newState.channelId === event.id || oldState.channelId === event.id)) {
		// event change is not related to event parameter
		return;
	}

	if (oldState.channelId === newState.channelId) {
		// user did not change channels
		return;
	}

	// At this point the event change is related to POAP tracking
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	if (!await isPOAPTrackingActive(db, event.value).catch(console.error)) {
		return;
	}

	// Check if user joined channel
	if (newState.channelId === event.id) {
		await updateUserForPOAP(newState.member, db, event.value, true).catch(console.error);
	} else {
		await updateUserForPOAP(newState.member, db, event.value, false).catch(console.error);
	}

	return dbInstance.close();
};

export const isPOAPTrackingActive = async (db: Db, eventValue: string): Promise<boolean> => {
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const result: POAPSettings = await poapSettingsDB.findOne({
		event: eventValue,
	});

	return !(result === null || !result.isActive);
};

export const updateUserForPOAP = async (guildMember: GuildMember, db: Db, eventValue: string, hasJoined: boolean): Promise<any> => {
	const poapParticipantsDb: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const currentDateStr = (new Date()).toISOString();

	const poapParticipant: POAPParticipant = await poapParticipantsDb.findOne({
		event: eventValue,
		discordId: guildMember.user.id,
	});

	if (!hasJoined) {
		console.log(`${guildMember.user.tag} | left ${eventValue}`);
		return poapParticipantsDb.updateOne(poapParticipant, {
			$set: {
				endTime: (new Date).toISOString(),
			},
		});
	}

	if (poapParticipant !== null && poapParticipant.discordId === guildMember.user.id) {
		console.log(`${guildMember.user.tag} | rejoined ${eventValue}`);
		return poapParticipantsDb.updateOne(poapParticipant, {
			$unset: {
				endTime: null,
			},
		});
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
