import { MessageReaction, PartialUser, User } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import messageReactionAddBounty from './bounty/MessageReactionAddBounty';
import ServiceUtils from '../utils/ServiceUtils';
import Log, { LogUtils } from '../utils/Log';
import ValidationError from '../errors/ValidationError';

export default class implements DiscordEvent {
	name = 'messageReactionAdd';
	once = false;
	
	async execute(reaction: MessageReaction, user: User | PartialUser): Promise<any> {
		
		try {
			// When a reaction is received, check if the structure is partial
			if (reaction.partial) {
				Log.info('Pulling full reaction from partial')
				await reaction.fetch();
			}

			if (user.partial) {
				Log.info('Pulling full user from partial')
				try {
					await user.fetch();
				} catch (error) {
					LogUtils.logError('failed to pull user partial', error);
					return;
				}
			}

			if (user.bot) {
				Log.info('Bot detected.')
				return;
			}
			if (ServiceUtils.isBanklessDAO(reaction.message.guild)) {
				await messageReactionAddBounty(reaction, user as User).catch(e => LogUtils.logError('failed to react to bounty', e));
			} else {
				Log.error(`Attempted 'MessageReactionAdd' on server that isn't allowlisted.`)
				throw new ValidationError(`Looks like the Bounty Board team hasn't allowlisted your server for reactions. Please reach out to your favorite Bounty Board representative! In the meantime, try using the slash commands. Begin by typing '/bounty'`)
			}
		} catch (e) {
			LogUtils.logError('failed to process event messageReactionAdd', e);
		}
	}
}
