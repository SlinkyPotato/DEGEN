import { MessageReaction, PartialUser, User } from 'discord.js';
import messageReactionAddBounty from './bounty/messageReactionAddBounty';

module.exports = {
	name: 'messageReactionAdd',
	once: false,
	
	async execute(reaction: MessageReaction, user: User | PartialUser) {
		// When a reaction is received, check if the structure is partial
		if (reaction.partial) {
			// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
			try {
				await reaction.fetch();
			} catch (error) {
				console.error('Something went wrong when fetching the message: ', error);
				return;
			}
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
			console.log('ignoring bot reactions');
			return;
		}
		
		await messageReactionAddBounty(reaction, user as User).catch(console.error);
	},
};
