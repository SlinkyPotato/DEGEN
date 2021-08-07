/**
 * Handler for Discord event `message`.
 */

import messageCreateOnBountyBoard from './bounty/messageCreateOnBountyBoard';

module.exports = {
	name: 'message',
	once: false,

	execute(message) {
		if(message.author.bot && message.webhookID === null) return;
		const greetings = ['Hello', 'Howdy', 'Hey', 'Go Bankless,', 'Nice to meet you,', 'It\'s great to see you,', 'Ahoy,'];
		if (message.content.toLowerCase().match('^.*degen$')) {
			message.channel.send(`${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!`);
		}
		messageCreateOnBountyBoard(message).catch(e => {
			console.error('ERROR: ', e);
		});
	},
};