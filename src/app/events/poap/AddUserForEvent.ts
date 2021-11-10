import { Guild, GuildChannel, GuildMember, VoiceState } from 'discord.js';
import { Collection, Cursor, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import constants from '../../service/constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import { POAPParticipant } from '../../types/poap/POAPParticipant';
import Log, { LogUtils } from '../../utils/Log';
import dayjs, { Dayjs } from 'dayjs';
import EndPOAP from '../../service/poap/EndPOAP';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (oldState: VoiceState, newState: VoiceState): Promise<any> => {
	if (oldState.channelId === newState.channelId && (oldState.deaf == newState.deaf)) {
		// user did not change channels
		return;
	}
	
	const guild: Guild = (oldState.guild != null) ? oldState.guild : newState.guild;
	const member: GuildMember = (oldState.guild != null) ? oldState.member : newState.member;
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const activeChannelsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
		isActive: true,
		discordServerId: `${guild.id}`,
	});
	for await (const poapSetting of activeChannelsCursor) {
		const currentDate: Dayjs = dayjs();
		try {
			const endDate: Dayjs = (poapSetting.endTime == null) ? currentDate : dayjs(poapSetting.endTime);
			if (currentDate.isBefore(endDate)) {
				const voiceChannel: GuildChannel = await guild.channels.fetch(poapSetting.voiceChannelId);
				await addUserToDb(oldState, newState, db, voiceChannel, member);
			} else {
				Log.debug(`current date is after or equal to event end date, currentDate: ${currentDate}, endDate: ${endDate}`);
				const poapOrganizerGuildMember: GuildMember = await guild.members.fetch(poapSetting.discordUserId);
				await EndPOAP(poapOrganizerGuildMember, constants.PLATFORM_TYPE_DISCORD);
			}
		} catch (e) {
			LogUtils.logError(`failed to add ${member.user.tag} to db`, e);
		}
	}
};

export const addUserToDb = async (
	oldState: VoiceState, newState: VoiceState, db: Db, channel: GuildChannel, member: GuildMember,
): Promise<any> => {
	if (!(newState.channelId === channel.id || oldState.channelId === channel.id)) {
		// event change is not related to event parameter
		return;
	}
	if (newState.deaf) {
		await updateUserForPOAP(member, db, channel, false, true).catch(e => LogUtils.logError('failed to capture user joined for poap', e));
		return;
	}
	const hasJoined: boolean = (newState.channelId === channel.id) || !newState.deaf;
	await updateUserForPOAP(member, db, channel, hasJoined).catch(e => LogUtils.logError(`failed to capture user change for POAP hasJoined: ${hasJoined}`, e));
	return;
};

export const updateUserForPOAP = async (
	member: GuildMember, db: Db, channel: GuildChannel, hasJoined?: boolean, hasDeafened?: boolean,
): Promise<any> => {
	const poapParticipantsDb: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const poapParticipant: POAPParticipant = await poapParticipantsDb.findOne({
		discordServerId: `${channel.guild.id}`,
		voiceChannelId: `${channel.id}`,
		discordUserId: `${member.user.id}`,
	});
	
	if (hasDeafened) {
		Log.debug(`${member.user.tag} | deafened themselves ${channel.name} in ${channel.guild.name}`);
		await poapParticipantsDb.deleteOne(poapParticipant);
		return;
	}

	if (!hasJoined) {
		Log.debug(`${member.user.tag} | left ${channel.name} in ${channel.guild.name}`);
		await poapParticipantsDb.updateOne(poapParticipant, {
			$set: {
				endTime: (new Date).toISOString(),
			},
		});
		return;
	}

	if (poapParticipant !== null && poapParticipant.discordUserId === member.user.id) {
		Log.debug(`${member.user.tag} | rejoined ${channel.name} in ${channel.guild.name}`);
		await poapParticipantsDb.updateOne(poapParticipant, {
			$unset: {
				endTime: null,
			},
		});
		return;
	}
	
	const currentDateStr = (new Date()).toISOString();
	const result: InsertOneWriteOpResult<POAPParticipant> = await poapParticipantsDb.insertOne({
		discordUserId: `${member.user.id}`,
		discordUserTag: `${member.user.tag}`,
		startTime: currentDateStr,
		voiceChannelId: `${channel.id}`,
		discordServerId: `${channel.guild.id}`,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapParticipant');
	}
	Log.debug(`${member.user.tag} | joined ${channel.name} in ${channel.guild.name}`);
};
