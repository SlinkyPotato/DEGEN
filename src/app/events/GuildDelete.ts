import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Guild } from 'discord.js';
import Log, { LogUtils } from '../utils/Log';
import {
	Collection as MongoCollection,
	Db,
	DeleteWriteOpResultObject,
} from 'mongodb';
import MongoDbUtils from '../utils/MongoDbUtils';
import constants from '../service/constants/constants';
import { DiscordServerCollection } from '../types/discord/DiscordServerCollection';
import { POAPAdmin } from '../types/poap/POAPAdmin';

export default class MessageCreate implements DiscordEvent {
	name = 'guildDelete';
	once = false;
	
	async execute(guild: Guild): Promise<any> {
		try {
			Log.debug(`guild left, guildId: ${guild.id}, name: ${guild.name}`);
			await removeGuildFromDB(guild);
			await removeAuthorizedUsersFromDB(guild);
		} catch (e) {
			LogUtils.logError('failed to handle setup for DEGEN after bot invite', e);
		}
	}
}

const removeGuildFromDB = async (guild: Guild): Promise<void> => {
	Log.debug('attempting to delete db data for guild');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordServerCollection: MongoCollection<DiscordServerCollection> = await db.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
	const result: DeleteWriteOpResultObject = await discordServerCollection.deleteOne({
		serverId: guild.id.toString(),
	});
	
	if (result == null || result.deletedCount != 1) {
		throw new Error('failed to remove guild from db');
	}
	Log.info(`guild removed from db, guildId: ${guild.id}, name: ${guild.name}`);
};

const removeAuthorizedUsersFromDB = async (guild: Guild) => {
	Log.debug('attempting to delete authorized poap users from guild');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordServerCollection: MongoCollection<POAPAdmin> = await db.collection<POAPAdmin>(constants.DB_COLLECTION_POAP_ADMINS);
	const result: DeleteWriteOpResultObject = await discordServerCollection.deleteMany({
		serverId: guild.id.toString(),
	});
	
	if (result == null || result.deletedCount == null || result.deletedCount < 0) {
		throw new Error('failed to delete authorized poap admins from db');
	}
	Log.info(`poap admins removed from db, guildId: ${guild.id}, name: ${guild.name}`);
};
