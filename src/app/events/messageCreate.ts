/**
 * Handler for Discord event `message`.
 */

import messageCreateOnBountyBoard from './bounty/messageCreateOnBountyBoard';
import { Message } from 'discord.js';

module.exports = {
	name: 'messageCreate',
	once: false,

	execute(message: Message) {
		if(message.author.bot && message.webhookId === null) return;
		const greetings = ['Hello', 'Howdy', 'Hey', 'Go Bankless,', 'Nice to meet you,', 'It\'s great to see you,', 'Ahoy,'];
		if (message.content.toLowerCase().match('^.*degen$')) {
			message.channel.send({ content: `${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!` });
		}
		messageCreateOnBountyBoard(message).catch(e => {
			console.error('ERROR: ', e);
		});
	},
};