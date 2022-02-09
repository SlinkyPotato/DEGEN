import { DiscordEvent } from '../types/discord/DiscordEvent';
import {
	Guild,
} from 'discord.js';
import Log, { LogUtils } from '../utils/Log';
import SetupDEGEN from '../service/setup/SetupDEGEN';

export default class MessageCreate implements DiscordEvent {
	name = 'guildCreate';
	once = false;
	
	async execute(guild: Guild): Promise<any> {
		try {
			Log.debug(`guild joined, guildId: ${guild.id}, name: ${guild.name}`);
			// await ServiceUtils.addActiveDiscordServer(guild).catch(Log.error);
			await SetupDEGEN(guild);
			Log.debug('guild finished joining');
		} catch (e) {
			LogUtils.logError('failed to handle setup for DEGEN after bot invite', e);
		}
	}
}

