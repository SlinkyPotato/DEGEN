import { Client, Guild } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log, { LogUtils } from '../utils/Log';
import MongoDbUtils from '../utils/MongoDbUtils';
import constants from '../service/constants/constants';

export default class implements DiscordEvent {
	name = 'ready';
	once = true;

	async execute(client: Client): Promise<any> {
		try {
			Log.info('Starting up legacy DEGEN...');
			
			if (client.user) {
				Log.debug(`setting status: ${process.env.DISCORD_BOT_ACTIVITY}`);
				client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY as string);
			}
			
			client.guilds.cache.forEach((guild: Guild) => {
				Log.info(`DEGEN active for: ${guild.id}, ${guild.name}`);
			});
			await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
			
			Log.info('DEGEN is ready!');
		} catch (e) {
			LogUtils.logError('Error processing event ready', e);
		}
	}
}
