import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Message } from 'discord.js';
import { LogUtils } from '../utils/Log';
import HandlePOAPGM from './chat/HandlePOAPGM';

export default class MessageCreate implements DiscordEvent {
	name = 'messageCreate';
	once = false;
	
	async execute(message: Message): Promise<any> {
		try {
			if (message.author.bot) return;
			
			await HandlePOAPGM(message);
			
		} catch (e) {
			LogUtils.logError('failed to handle message from user', e);
		}
	}
}