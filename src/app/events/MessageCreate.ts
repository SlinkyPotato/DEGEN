import messageCreateOnBountyBoard from './bounty/MessageCreateOnBountyBoard';
import messageSetScoapRoles from './scoap-squad/messageSetScoapRoles';
import { Message } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';

export default class implements DiscordEvent {
	name = 'messageCreate';
	once = false;

	execute(message: Message): Promise<any> {
		if(message.author.bot && message.webhookId === null) return;
		const greetings = ['Hello', 'Howdy', 'Hey', 'Go Bankless,', 'Nice to meet you,', 'It\'s great to see you,', 'Ahoy,'];
		if (message.content.toLowerCase().match('^.*degen$')) {
			message.channel.send({ content: `${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!` });
		}
		messageCreateOnBountyBoard(message).catch(e => {
			console.error('ERROR: ', e);
		});
		messageSetScoapRoles(message).catch(e => {
			console.error('ERROR: ', e);
		});
	}
}