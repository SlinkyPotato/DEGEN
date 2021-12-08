import { Client, Guild } from 'discord.js';
import constants from '../service/constants/constants';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log, { LogUtils } from '../utils/Log';
import POAPService from '../service/poap/POAPService';
import MongoDbUtils from '../utils/MongoDbUtils';

export default class implements DiscordEvent {
	name = 'ready';
	once = true;

	async execute(client: Client): Promise<any> {
		try {
			Log.info('The Sun will never set on the DAO. Neither will I. DEGEN & Serendipity are ready for service.');
			
			client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY);
			client.guilds.cache.forEach((guild: Guild) => {
				Log.info(`DEGEN active for: ${guild.id}, ${guild.name}`);
			});
			await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
			await POAPService.runAutoEndSetup(client, constants.PLATFORM_TYPE_DISCORD).catch(Log.error);
			await POAPService.runAutoEndSetup(client, constants.PLATFORM_TYPE_TWITTER).catch(Log.error);
			await POAPService.clearExpiredPOAPs().catch(Log.error);
			
			Log.info('DEGEN is ready!');
		} catch (e) {
			LogUtils.logError('Error processing event ready', e);
		}
	}
}
