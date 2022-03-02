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
			await removeDeafenedUser(oldState.channelId, oldState.guild.id, oldState.id, oldState.member?.user.tag);
		}
		if (newState.channelId != oldState.channelId && await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			Log.log(`user has deafened for new channel, userId: ${newState.id}`);
			await removeDeafenedUser(newState.channelId, newState.guild.id, newState.id, oldState.member?.user.tag);
		}
		return;
	}
	
	if (hasUserBeenUnDeafened(oldState, newState)) {
		if (await isChannelActivePOAPEvent(newState.channelId, newState.guild.id)) {
			const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
			const addtionalPoapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_ADDITIONAL_POAP_PARTICIPANTS_LIST);
			const undeafenedUser = retrieveParticipantFromAdditionalList({ id: newState.id, tag: newState.member?.user.tag }, newState.channelId, newState.guild.id);
			const undeafenedUserQuery: POAPParticipant | null = await addtionalPoapParticipantsCol.findOne({
				discordUserId: newState.id,
			});
			let currentMinutesDeafened = 0.0;
			if(undeafenedUserQuery?.minutesDeafened) {
				currentMinutesDeafened = undeafenedUserQuery?.minutesDeafened;
			}
			const timediff: number = dayjs().diff(undeafenedUserQuery?.timeDeafened, 'm', true);
			const minutesDeafened: number = timediff + currentMinutesDeafened;
			const resultUpdate: UpdateWriteOpResult | void = await addtionalPoapParticipantsCol.updateOne(undeafenedUser, {
				$set: {
					minutesDeafened: minutesDeafened,
					timeDeafened: '',
				},
			}).catch(Log.error);
			if (!resultUpdate) {
				Log.error('Failed to update addtional participant info in db');
			}
			Log.log(`user has undeafened for new channel, userId: ${newState.id}`);
			await startTrackingUserParticipation({ id: newState.id, tag: newState.member?.user.tag }, newState.guild.id, newState.channelId);
		}
	}
	
	if (isUserDeaf(newState)) {
		return;
	}
	
	if (hasUserChangedChannels(oldState, newState)) {
		if (await isChannelActivePOAPEvent(oldState.channelId, oldState.guild.id)) {
			const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
			const addtionalPoapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_ADDITIONAL_POAP_PARTICIPANTS_LIST);
			const leavingUser = retrieveParticipantFromAdditionalList({ id: oldState.id, tag: oldState.member?.user.tag }, oldState.channelId, oldState.guild.id);
			const leavingUserQuery: POAPParticipant | null = await addtionalPoapParticipantsCol.findOne({
				discordUserId: oldState.id,
			});
			const participant = await retrieveActiveParticipant({ id: oldState.id, tag: oldState.member?.user.tag }, oldState.channelId, `${oldState.member?.user.tag}`);
			if (!leavingUserQuery) {
				const minutesAttended = dayjs().diff(participant?.startTime, 'm', true);
				const resultInsert: InsertOneWriteOpResult<POAPParticipant> | void = await addtionalPoapParticipantsCol.insertOne({
					discordUserId: oldState.id,
					discordUserTag: oldState.member?.user.tag,
					voiceChannelId: oldState.channelId,
					minutesAttended:  minutesAttended,
					timeLeft: dayjs().toISOString(),
				} as POAPParticipant).catch(Log.error);
				if (resultInsert) {
					Log.error('Failed to insert participant additional info in db');
				}
			} else {
				let initialDuration = 0.0;
				if(leavingUserQuery?.minutesAttended) {
					initialDuration = leavingUserQuery?.minutesAttended;
				}
				const minutesAttended = initialDuration + dayjs().diff(participant?.startTime, 'm', true);
				const resultInsert: UpdateWriteOpResult | void = await addtionalPoapParticipantsCol.updateOne(leavingUser, {
					$set: {
						minutesAttended: minutesAttended,
						timeLeft: dayjs().toISOString(),
					},
				}).catch(Log.error);
				if (!resultInsert) {
					Log.error('Failed to update participant additional info in db');
				}
			}
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

const removeDeafenedUser = async (channelId: string | null, guildId: string | null, userId: string | null, userTag: string | undefined) => {
	if (channelId == null || guildId == null || userId == null) {
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const addtionalPoapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_ADDITIONAL_POAP_PARTICIPANTS_LIST);
	const undeafenedUser = retrieveParticipantFromAdditionalList({ id: userId, tag: userTag }, channelId, guildId);
	const participant = await retrieveActiveParticipant({ id: userId, tag: userTag }, channelId, guildId);
	const undeafenedUserQuery: POAPParticipant | null = await addtionalPoapParticipantsCol.findOne({
		discordUserId: userId,
	});
	let minutesListened = 0.0;
	if (undeafenedUserQuery?.minutesListened) {
		minutesListened = undeafenedUserQuery?.minutesListened;
	}
	if (undeafenedUser) {
		await addtionalPoapParticipantsCol.updateOne(undeafenedUser, {
			$set: {
				timeDeafened: dayjs().toISOString(),
				minutesListened: minutesListened + dayjs().diff(participant?.startTime, 'm', true),
			},
		}).catch(Log.error);
	}else {
		const resultInsert: InsertOneWriteOpResult<POAPParticipant> | void = await addtionalPoapParticipantsCol.insertOne({
			discordUserId: userId,
			voiceChannelId: channelId,
			timeDeafened: dayjs().toISOString(),
			discordServerId: guildId,
			minutesDeafened: 0,
			discordUserTag: userTag,
			minutesListened: dayjs().diff(participant?.startTime, 'm', true),
		} as POAPParticipant).catch(Log.warn);
		if (resultInsert == null || resultInsert.insertedCount !== 1) {
			throw new MongoError('failed to insert poapParticipant');
		}
	}

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
	const addtionalPoapParticipantsCol: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_ADDITIONAL_POAP_PARTICIPANTS_LIST);
	const leavingUser = retrieveParticipantFromAdditionalList(user, channelId, guildId);
	const leavingUserQuery: POAPParticipant | null = await addtionalPoapParticipantsCol.findOne({
		discordUserId: user.id,
	});
	if (!leavingUserQuery) {
		const minutesAttended = dayjs().diff(participant.startTime, 'm', true);
		const resultInsert: InsertOneWriteOpResult<POAPParticipant> | void = await addtionalPoapParticipantsCol.insertOne({
			discordUserId: user.id,
			discordUserTag: user.tag,
			voiceChannelId: channelId,
			minutesAttended:  minutesAttended,
			timeLeft: dayjs().toISOString(),
		} as POAPParticipant).catch(Log.error);
		if (!resultInsert) {
			Log.debug('Failed to insert participant additional info in db');
		}
	} else {
		let initialDuration = 0.0;
		if(leavingUserQuery?.minutesAttended) {
			initialDuration = leavingUserQuery?.minutesAttended;
		}
		const minutesAttended = initialDuration + dayjs().diff(participant.startTime, 'm', true);
		const resultInsert: UpdateWriteOpResult | void = await addtionalPoapParticipantsCol.updateOne(leavingUser, {
			$set: {
				minutesAttended: minutesAttended,
				timeLeft: dayjs().toISOString(),
			},
		}).catch(Log.error);
		if (!resultInsert) {
			Log.error('Failed to update participant additional info in db');
		}
	}
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
const retrieveParticipantFromAdditionalList = async (
	user: BasicUser, channelId: string | null, guildId: string,
): Promise<POAPParticipant | null> => {
	if (user.id == null || channelId == null || guildId == null) {
		return null;
	}
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const addPoapParticipantsDb: Collection<POAPParticipant> = db.collection(constants.DB_COLLECTION_ADDITIONAL_POAP_PARTICIPANTS_LIST);
	return await addPoapParticipantsDb.findOne({
		discordUserId: user.id,
		voiceChannelId: channelId,
		discordServerId: guildId,
	});
};
export default HandleParticipantDuringEvent;