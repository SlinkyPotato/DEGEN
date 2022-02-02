import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Guild } from 'discord.js';
import Log, { LogUtils } from '../utils/Log';
import ServiceUtils from '../utils/ServiceUtils';
import SetupDEGEN from '../service/setup/SetupDEGEN';

export default class MessageCreate implements DiscordEvent {
	name = 'guildCreate';
	once = false;
	
	async execute(guild: Guild): Promise<any> {
		try {
			Log.debug(guild);
			await ServiceUtils.addActiveDiscordServer(guild).catch(Log.error);
			await SetupDEGEN(guild).catch(Log.error);
			
		} catch (e) {
			LogUtils.logError('failed to handle setup for DEGEN after bot invite', e);
		}
	}
}
