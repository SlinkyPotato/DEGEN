import messageCreateOnBountyBoard from './bounty/MessageCreateOnBountyBoard';
import messageSetScoapRoles from './scoap-squad/messageSetScoapRoles';
import messageLaunchFirstQuest from './first-quest/messageLaunchFirstQuest';
import { Message } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import MessageCreateOnDEGEN from './chat/MessageCreateOnDEGEN';
import ServiceUtils from '../utils/ServiceUtils';
import { LogUtils } from '../utils/Log';
import HandleAFK from './chat/HandleAFK';

export default class implements DiscordEvent {
	name = 'messageCreate';
	once = false;

	async execute(message: Message): Promise<any> {
		try {
			if(message.author.bot) return;
			// DEGEN says hello
			await MessageCreateOnDEGEN(message).catch(e => {
				LogUtils.logError('DEGEN failed to say hello', e);
			});
			if (ServiceUtils.isBanklessDAO(message.guild)) {
				// Run for webhook
				await messageCreateOnBountyBoard(message).catch(e => {
					LogUtils.logError('failed to create bounty message from webhook', e);
				});
			}
			if (message.channel.type === 'DM') {
				// Run scoap squad DM flow
				await messageSetScoapRoles(message).catch(e => {
					LogUtils.logError('failed to run scoap-squad DM flow', e);
				});

				// Run first-quest DM flow
				await messageLaunchFirstQuest(message).catch(e => {
					LogUtils.logError('failed to run first-quest DM flow', e);
				});
			}
			// Check mentions for AFK users
			if (message.mentions.users.size > 0) {
				await HandleAFK(message).catch((e) => {
					LogUtils.logError('DEGEN failed to handle AFK', e);
				});
			}
		} catch (e) {
			LogUtils.logError('failed to process event messageCreate', e);
		}
	}
}
