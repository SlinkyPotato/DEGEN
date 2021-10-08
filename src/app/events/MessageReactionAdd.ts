import { MessageReaction, PartialUser, User } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import messageReactionAddBounty from './bounty/MessageReactionAddBounty';

export default class implements DiscordEvent {
	name = 'messageReactionAdd';
	once = false;
	
	async execute(reaction: MessageReaction, user: User | PartialUser): Promise<any> {
		try {
			// When a reaction is received, check if the structure is partial
			if (reaction.partial) {
				await reaction.fetch();
			}

			if (user.partial) {
				try {
					await user.fetch();
				} catch (error) {
					console.error('Something is not working for pulling the user, maybe account was removed? lol');
					return;
				}
			}

			if (user.bot) {
				return;
			}
			await messageReactionAddBounty(reaction, user as User);
		} catch (e) {
			console.error(e);
		}
	}
}
