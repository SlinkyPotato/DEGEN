/**
 * Handler for Discord event `message`.
 */

module.exports = {
	name: 'message',
	once: false,

	execute(message) {
		if(message.author.bot) return;
		const greetings = ['Hello', 'Howdy', 'Hey', 'Go Bankless,', 'Nice to meet you,', 'It\'s great to see you,', 'Ahoy,'];
		if (message.content.toLowerCase().match('^.*degen$')) {
			message.channel.send(`${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!`);
		}
	},
};