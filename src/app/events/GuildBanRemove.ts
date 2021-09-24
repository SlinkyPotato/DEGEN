import { GuildBan } from 'discord.js';
import { Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import constants from '../service/constants/constants';
import { Allowlist } from '../types/discord/Allowlist';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import dbInstance from '../utils/dbUtils';

export default class implements DiscordEvent {
	name = 'guildBanRemove';
	once = false;

	async execute(ban: GuildBan): Promise<any> {
		// Add unbanned users to allowlist so they don't get auto-banned by the bot
		const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
		const dbAllowlist = db.collection(constants.DB_COLLECTION_ALLOWLIST);

		const result: InsertOneWriteOpResult<Allowlist> = await dbAllowlist.insertOne({
			discordUserId: ban.user.id,
			discordServerId: ban.guild.id,
		});
		if (result == null || result.insertedCount !== 1) {
			throw new MongoError(`failed to insert ${ban.user.id} into allowlist`);
		}
	}
}