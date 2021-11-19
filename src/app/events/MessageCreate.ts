import messageCreateOnBountyBoard from './bounty/MessageCreateOnBountyBoard';
import { Message } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import MessageCreateOnBB from './chat/MessageCreateOnBB';
import ServiceUtils from '../utils/ServiceUtils';
import { LogUtils } from '../utils/Log';

export default class implements DiscordEvent {
	name = 'messageCreate';
	once = false;

	async execute(message: Message): Promise<any> {
		try {
			if(message.author.bot) return;

			// Bounty Bot says hello
			await MessageCreateOnBB(message).catch(e => {
				LogUtils.logError('BountyBot failed to say hello', e);
			});
			
			if (ServiceUtils.isBanklessDAO(message.guild)) {
				// Run for webhook
				await messageCreateOnBountyBoard(message).catch(e => {
					LogUtils.logError('failed to create bounty message from webhook', e);
				});
			}
		} catch (e) {
			LogUtils.logError('failed to process event messageCreate', e);
		}
	}
}
