import {
	VoiceState,
} from 'discord.js';
import {
	Collection,
	Db,
	InsertOneWriteOpResult,
	MongoError,
	UpdateWriteOpResult,
} from 'mongodb';
import constants from '../../service/constants/constants';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import Log from '../../utils/Log';
import dayjs from 'dayjs';
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
			await updateDeafenedUser({ id: oldState.id, tag: oldState.member?.user.tag }, oldState.channelId, oldState.guild.id, oldState.id);
		}
		if (newState.channelId != oldState.channelId && await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			Log.log(`user has deafened for new channel, userId: ${newState.id}`);
			await updateDeafenedUser({ id: newState.id, tag: newState.member?.user.tag }, newState.channelId, newState.guild.id, newState.id);
		}
		return;
	}
	
	if (hasUserBeenUnDeafened(oldState, newState)) {
		if (await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			Log.log(`user has undeafened for new channel, userId: ${newState.id}`);
			await startTrackingUndeafenedUserParticipation({ id: newState.id, tag: newState.member?.user.tag }, newState.guild.id, newState.channelId);
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

const updateDeafenedUser = async (user:BasicUser, channelId: string | null, guildId: string | null, userId: string | null) => {
	if (channelId == null || guildId == null || userId == null) {
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	
	const participant = retrieveActiveParticipant(user, channelId, guildId);
	const result: UpdateWriteOpResult | void = await poapParticipantsCol.updateOne(participant, {
		$set: {
			timeDeafened: dayjs().toISOString(),
		},
	}).catch(Log.error);
	if (result != null) {
		Log.debug(`user deafened themselves and updated db, userId: ${userId}, channelId: ${channelId}, discordServerId: ${guildId}`);
		return;
	}
	Log.debug('deafened user not removed/found in any active channels');
};
export const startTrackingUndeafenedUserParticipation = async (user: BasicUser, guildId: string, channelId: string | null): Promise<void> => {

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
	let deafenedDuration = dayjs().diff(participant?.timeDeafened, 'm', true);
	if (participant.minutesDeafenedInMeeting) {
		deafenedDuration += participant.minutesDeafenedInMeeting;
	}
	const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
		$set: {
			minutesDeafenedInMeeting: deafenedDuration,
		},
		$unset: {
			timeDeafened: '',
		},
	}).catch(Log.error);
	if (!updateResult) {
		Log.debug('user not updated in db');
	}

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
	if (participant.endTime != null && participant.timeLeft != null) {
		let minutesAbsent = dayjs().diff(participant.timeLeft, 'm', true);
		if (participant.minutesAbsent) {
			minutesAbsent += participant.minutesAbsent;
		}
		const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
			$set: {
				timeJoined: dayjs().toISOString(),
				minutesAbsent: minutesAbsent,
			},
			$unset: {
				endTime: '',
				timeLeft: '',
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
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsDb: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const minutesAbsent = dayjs().diff(participant?.timeLeft, 'm', true);
	const result: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
		$set: {
			endTime: dayjs().toISOString(),
			timeLeft: dayjs().toISOString(),
			minutesAbsent: minutesAbsent,
		},
	}).catch(Log.error);
	
	if (result == null || result.result.ok != 1) {
		throw new MongoError('failed to update present participant in db');
	}
	Log.debug(`${user.tag} | left, channelId: ${channelId}, guildId: ${guildId}, userId: ${user.id}`);
};
export const updateDurations = async (participant: POAPParticipant, poapParticipantsDb: Collection<POAPParticipant>): Promise<void> => {
	let minutesDeafened = 0;
	let minutesAbsent = 0;
	if(participant.timeLeft != '' && participant.timeLeft != null) {
		minutesAbsent = dayjs().diff(participant?.timeLeft, 'm', true);
		if (participant.minutesAbsent) {
			minutesAbsent += participant.minutesAbsent;
		}
		const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
			$set: {
				minutesAbsent: minutesAbsent,
			},
		}).catch(Log.error);
		
		if (updateResult == null || updateResult.result.ok != 1) {
			Log.error('failed to update participant in db');
		}
	}

	if(participant.timeDeafened != '' && participant.timeDeafened != null) {
		minutesDeafened = dayjs().diff(participant?.timeDeafened, 'm', true);
		if (participant.minutesDeafenedInMeeting) {
			minutesDeafened += participant.minutesDeafenedInMeeting;
		}
		
		const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
			$set: {
				minutesDeafenedInMeeting: minutesDeafened,
			},
		}).catch(Log.error);
		
		if (updateResult == null || updateResult.result.ok != 1) {
			Log.error('failed to update participant in db');
		}
	}

	// update the amount of time the user spent active
	let durationInMinutes = dayjs().diff(participant.startTime, 'm', true);
	durationInMinutes = durationInMinutes - minutesDeafened - minutesAbsent;
	const updateResult: UpdateWriteOpResult | void = await poapParticipantsDb.updateOne(participant, {
		$set: {
			durationInMinutes: durationInMinutes,
			endTime: dayjs().toISOString(),
		},
	}).catch(Log.error);
	if (updateResult == null || updateResult.result.ok != 1) {
		Log.error('failed to update participant in db');
	}
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
