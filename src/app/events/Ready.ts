import { Client, Guild } from 'discord.js';
import constants from '../service/constants/constants';
import discordServerIds from '../service/constants/discordServerIds';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log, { LogUtils } from '../utils/Log';
import MongoDbUtils from '../utils/MongoDbUtils';

export default class implements DiscordEvent {
	name = 'ready';
	once = true;

	async execute(client: Client): Promise<any> {
		try {
			Log.info(`Gotta catch em all! - Bountybot (ready for service)`);
			
			client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY);
			client.guilds.cache.forEach((guild: Guild) => {
				Log.info(`Bountybot active for: ${guild.id}, ${guild.name}`);
			});

			if (client.guilds.cache.some((guild) => guild.id == discordServerIds.banklessDAO || guild.id == discordServerIds.discordBotGarage)) {
				await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
			}

			
			Log.info('Bountybot is ready!');
		} catch (e) {
			LogUtils.logError('Error processing event ready', e);
		}
	}
}