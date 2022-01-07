import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Guild } from 'discord.js';
import Log, { LogUtils } from '../utils/Log';
import ServiceUtils from '../utils/ServiceUtils';

export default class MessageCreate implements DiscordEvent {
	name = 'guildCreate';
	once = false;
	
	async execute(guild: Guild): Promise<any> {
		try {
			await ServiceUtils.addActiveDiscordServer(guild).catch(Log.error);
			
		} catch (e) {
			LogUtils.logError('failed to handle message from user', e);
		}
	}
}