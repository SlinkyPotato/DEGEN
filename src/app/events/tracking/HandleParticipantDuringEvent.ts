import {
	VoiceState,
} from 'discord.js';
import {
	Collection,
	Db,
	DeleteWriteOpResultObject,
	InsertOneWriteOpResult,
	MongoError,
	UpdateWriteOpResult,
} from 'mongodb';
import constants from '../../service/constants/constants';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import Log from '../../utils/Log';
import dayjs, { Dayjs } from 'dayjs';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { POAPSettings } from '../../types/poap/POAPSettings';

type BasicUser = {
	id: string;
	tag: string | undefined;
}

const HandleParticipantDuringEvent = async (oldState: VoiceState, newState: VoiceState): Promise<any> => {
	if (hasUserBeenDeafened(oldState, newState)) {
		if (await isChannelActivePOAPEvent(oldState.channelId, oldState.guild.id)) {
			Log.log(`user has deafened for previous channel, userId: ${newState.id}`);
			await removeDeafenedUser(oldState.channelId, oldState.guild.id, oldState.id);
		}
		if (newState.channelId != oldState.channelId && await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			Log.log(`user has deafened for new channel, userId: ${newState.id}`);
			await removeDeafenedUser(newState.channelId, newState.guild.id, newState.id);
		}
		return;
	}
	
	if (hasUserBeenUnDeafened(oldState, newState)) {
		if (await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			Log.log(`user has undeafened for new channel, userId: ${newState.id}`);
			await startTrackingUserParticipation({ id: newState.id, tag: newState.member?.user.tag }, newState.guild.id, newState.channelId);
		}
	}
	
	if (isUserDeaf(newState)) {
		return;
	}
	
	if (hasUserChangedChannels(oldState, newState)) {
		if (await isChannelActivePOAPEvent(oldState.channelId, oldState.guild.id)) {
			await stopTrackingUserParticipation({ id: oldState.id, tag: oldState.member?.user.tag }, oldState.guild.id, oldState.channelId, null);
		}
		if (await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			await startTrackingUserParticipation({ id: newState.id, tag: newState.member?.user.tag }, newState.guild.id, newState.channelId);
		}
	}
	
};

const hasUserBeenDeafened = (oldState: VoiceState, newState: VoiceState): boolean => {
	return newState.deaf != null && newState.deaf && newState.deaf != oldState.deaf;
};

const hasUserBeenUnDeafened = (oldState: VoiceState, newState: VoiceState): boolean => {
	return newState.deaf != null && !newState.deaf && newState.deaf != oldState.deaf;
};

const isUserDeaf = (newState: VoiceState): boolean => {
	return newState.deaf !== null && newState.deaf;
};

const hasUserChangedChannels = (oldState: VoiceState, newState: VoiceState): boolean => {
	return newState.channelId != oldState.channelId;
};

const isChannelActivePOAPEvent = async (
	channelId: string | null, guildId: string | null,
): Promise<boolean> => {
	if (channelId == null || guildId == null) {
		return false;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection<POAPSettings> = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const activeEvent: POAPSettings | null = await poapSettingsDB.findOne({
		isActive: true,
		voiceChannelId: channelId,
		discordServerId: guildId,
	});
	
	if (activeEvent != null) {
		// Log.debug(`channel is active, channelId: ${channelId}, guildId: ${guildId}`);
		return true;
	}
	
	// Log.debug('channel not active');
	return false;
};

const removeDeafenedUser = async (channelId: string | null, guildId: string | null, userId: string | null) => {
	if (channelId == null || guildId == null || userId == null) {
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	
	const result: DeleteWriteOpResultObject | void = await poapParticipantsCol.deleteOne({
		voiceChannelId: channelId,
		discordServerId: guildId,
		discordUserId: userId,
	}).catch(Log.warn);
	if (result != null && result.deletedCount == 1) {
		Log.debug(`user deafened themselves and removed from db, userId: ${userId}, channelId: ${channelId}, discordServerId: ${guildId}`);
		return;
	}
	Log.debug('deafened user not removed/found in any active channels');
};

export const startTrackingUserParticipation = async (user: BasicUser, guildId: string, channelId: string | null): Promise<void> => {
	const participant = await retrieveActiveParticipant(user, channelId, guildId);
	
	channelId = channelId as string;
	guildId = guildId as string;
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsDb: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	if (participant == null) {
		const userTag: string = user.tag ? user.tag : '';
		const resultInsert: InsertOneWriteOpResult<POAPParticipant> | void = await poapParticipantsDb.insertOne({
			discordUserId: user.id,
			discordUserTag: userTag,
			voiceChannelId: channelId,
			startTime: dayjs().toISOString(),
			discordServerId: guildId,
			durationInMinutes: 0,
		} as POAPParticipant).catch(Log.error);
		if (resultInsert == null || resultInsert.insertedCount !== 1) {
			throw new MongoError('failed to insert poapParticipant');
		}
		Log.debug(`${user.tag} | joined, channelId: ${channelId}, guildId: ${guildId}, userId: ${user.id}`);
		return;
	}
	if (participant.endTime != null) {
		const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
			$set: {
				startTime: dayjs().toISOString(),
			},
			$unset: {
				endTime: '',
			},
		}).catch(Log.error);
		
		if (updateResult == null || updateResult.result.ok != 1) {
			Log.error('failed to update rejoined participant in db');
		}
		Log.debug(`${user.tag} | rejoined, channelId: ${channelId}, guildId: ${guildId}, userId: ${user.id}`);
	}
};

export const stopTrackingUserParticipation = async (user: BasicUser, guildId: string, channelId: string | null, participant: POAPParticipant | null): Promise<void> => {
	if (!participant) {
		participant = await retrieveActiveParticipant(user, channelId, guildId);
	}
	
	if (participant == null) {
		throw new MongoError('could not find participant in db when trying to stop tracking');
	}
	
	channelId = channelId as string;
	guildId = guildId as string;
	
	const durationInMinutes: number = calculateDuration(participant.startTime, participant.durationInMinutes);
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsDb: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const result: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
		$set: {
			endTime: dayjs().toISOString(),
			durationInMinutes: durationInMinutes,
		},
	}).catch(Log.error);
	
	if (result == null || result.result.ok != 1) {
		throw new MongoError('failed to update present participant in db');
	}
	Log.debug(`${user.tag} | left, channelId: ${channelId}, guildId: ${guildId}, userId: ${user.id}`);
};

const calculateDuration = (startTime: string, currentDuration: number): number => {
	const currentDate: Dayjs = dayjs();
	const startTimeDate: Dayjs = dayjs(startTime);
	let durationInMinutes: number = currentDuration;
	if ((currentDate.unix() - startTimeDate.unix() > 0)) {
		durationInMinutes += ((currentDate.unix() - startTimeDate.unix()) / 60);
	}
	return durationInMinutes;
};

const retrieveActiveParticipant = async (
	user: BasicUser, channelId: string | null, guildId: string,
): Promise<POAPParticipant | null> => {
	if (user.id == null || channelId == null || guildId == null) {
		return null;
	}
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsDb: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	return await poapParticipantsDb.findOne({
		discordUserId: user.id,
		voiceChannelId: channelId,
		discordServerId: guildId,
	});
};

export default HandleParticipantDuringEvent;