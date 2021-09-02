import BotConversationMessageFlow from '../../service/scoap-squad/BotConversationMessageFlow';
import { botConvoState } from '../../app';
import { Message } from 'discord.js';
import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';

export default async (message: Message): Promise<any> => {

	const botConvo = botConvoState[message.author.id];

	console.log('message event triggered, message author is: ', message.author.id);

	if (messageIsValid(message, botConvo)) {

		if (botConvo.getEdit()) {
			scoapEmbedUpdate(botConvo, message.content);
		}
		BotConversationMessageFlow(message, botConvo);
		return;
	};
	return;
};

const messageIsValid = (message, botConvo) => {
	if (typeof botConvo != 'undefined') {
		return (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id);
	} else {
		return false;
	}
	// returns true if this message is a direct response to botConvo.current_message
	
};