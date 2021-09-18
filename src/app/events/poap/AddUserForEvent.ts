import { Guild, GuildChannel, GuildMember, VoiceState } from 'discord.js';
import { Collection, Cursor, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../../service/constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import { POAPParticipant } from '../../types/poap/POAPParticipant';

export default async (oldState: VoiceState, newState: VoiceState): Promise<any> => {
	if (oldState.channelId === newState.channelId) {
		// user did not change channels
		return;
	}
	const guild: Guild = (oldState.guild != null) ? oldState.guild : newState.guild;
	const member: GuildMember = (oldState.guild != null) ? oldState.member : newState.member;
	
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const activeChannelsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
		isActive: true,
		discordServerId: guild.id,
	});
	for await (const poapSetting of activeChannelsCursor) {
		try {
			const voiceChannel: GuildChannel = await guild.channels.fetch(poapSetting.voiceChannelId);
			await addUserToDb(oldState, newState, db, voiceChannel, member);
		} catch (e) {
			console.log(`failed to add ${member.user.tag} to db`);
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

	// Check if user joined channel
	if (newState.channelId === channel.id) {
		await updateUserForPOAP(member, db, channel, true).catch(console.error);
	} else {
		await updateUserForPOAP(member, db, channel, false).catch(console.error);
	}

	return;
};

export const updateUserForPOAP = async (
	member: GuildMember, db: Db, channel: GuildChannel, hasJoined: boolean,
): Promise<any> => {
	const poapParticipantsDb: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const currentDateStr = (new Date()).toISOString();

	const poapParticipant: POAPParticipant = await poapParticipantsDb.findOne({
		discordServerId: channel.guild.id,
		voiceChannelId: channel.id,
		discordUserId: member.user.id,
	});

	if (!hasJoined) {
		console.log(`${member.user.tag} | left ${channel.name} from ${channel.guild.name}`);
		return poapParticipantsDb.updateOne(poapParticipant, {
			$set: {
				endTime: (new Date).toISOString(),
			},
		});
	}

	if (poapParticipant !== null && poapParticipant.discordUserId === member.user.id) {
		console.log(`${member.user.tag} | rejoined ${channel.name} from ${channel.guild.name}`);
		return poapParticipantsDb.updateOne(poapParticipant, {
			$unset: {
				endTime: null,
			},
		});
	}

	const result: InsertOneWriteOpResult<POAPParticipant> = await poapParticipantsDb.insertOne({
		discordUserId: member.user.id,
		discordUserTag: member.user.tag,
		startTime: currentDateStr,
		voiceChannelId: channel.id,
		discordServerId: channel.guild.id,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapParticipant');
	}
	console.log(`${member.user.tag} | joined ${channel.name} from ${channel.guild.name}`);
};
