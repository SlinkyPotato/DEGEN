import BotConversationMessageFlow from '../../service/scoap-squad/BotConversationMessageFlow';
import { botConvoState } from '../../service/scoap-squad/ScoapDatabase';
import { Message } from 'discord.js';
import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';

export default async (message: Message): Promise<any> => {

	const botConvo = botConvoState[message.author.id];
	if (await messageIsValid(message, botConvo)) {

		if (botConvo.getEdit()) {
			await scoapEmbedUpdate(botConvo, message);
			if (botConvo.getCurrentMessageFlowIndex() === '6' || botConvo.getCurrentMessageFlowIndex() === '7') {
				await BotConversationMessageFlow(message, botConvo);
			}
		} else {
			await BotConversationMessageFlow(message, botConvo);
		}
		return;
	}
	return;
};

const messageIsValid = async (message, botConvo): Promise<any> => {
	// returns true if this message is a direct response to botConvo.current_message
	if (typeof botConvo != 'undefined') {
		return (await message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id);
	} else {
		return false;
	}
};