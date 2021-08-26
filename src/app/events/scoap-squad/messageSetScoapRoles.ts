import BotConversationMessageFlow from '../../service/scoap-squad/BotConversationMessageFlow';
import { botConvoArray } from '../../app';
import { Message } from 'discord.js';
import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';
import ScoapUtils from '../../utils/ScoapUtils';

export default async (message: Message): Promise<any> => {

	const botConvoIndex = ScoapUtils.retrieveObjectFromArray(botConvoArray, message.channel);
	if (botConvoIndex === -1) return;
	const botConvo = botConvoArray[botConvoIndex];

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
	// returns true if this message is a direct response to botConvo.current_message
	return (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id);
};