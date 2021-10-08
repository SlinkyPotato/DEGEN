import messageCreateOnBountyBoard from './bounty/MessageCreateOnBountyBoard';
import messageSetScoapRoles from './scoap-squad/messageSetScoapRoles';
import { Message } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import MessageCreateOnDEGEN from './chat/MessageCreateOnDEGEN';
import ServiceUtils from '../utils/ServiceUtils';

export default class implements DiscordEvent {
	name = 'messageCreate';
	once = false;

	async execute(message: Message): Promise<any> {
		try {
			if(message.author.bot || message.webhookId === null) return;
			
			if (ServiceUtils.isBanklessDAO(message.guild)) {
				// DEGEN says hello
				await MessageCreateOnDEGEN(message).catch(e => {
					console.error('ERROR: ', e);
				});
				// Run for webhook
				await messageCreateOnBountyBoard(message).catch(e => {
					console.error('ERROR: ', e);
				});
				await messageSetScoapRoles(message).catch(e => {
					console.error('ERROR: ', e);
				});
			}
		} catch (e) {
			console.error(e);
		}
	}
}