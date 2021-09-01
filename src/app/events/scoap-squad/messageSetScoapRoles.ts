import BotConversationMessageFlow from '../../service/scoap-squad/BotConversationMessageFlow';
import { botConvoState } from '../../app';
import { Message } from 'discord.js';
import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';
// import ScoapUtils from '../../utils/ScoapUtils';

export default async (message: Message): Promise<any> => {

	// const botConvoIndex = ScoapUtils.retrieveObjectFromArray(botConvoArray, message.author.id);
	// if (botConvoIndex === -1) return;
	// const botConvo = botConvoArray[botConvoIndex];

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
	console.log('MSG CHANNEL ', message.channel);
	console.log('BOT CONVO CHANNEL ', botConvo.getCurrentChannel());
	console.log('MESSAGE VALID ', (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id));
	console.log('MESSAGE ID LAST TWO KEYS ', message.channel.messages.cache.lastKey(2));
	console.log('MESSAGE ID LAST TWO KEYS[0] ', message.channel.messages.cache.lastKey(2)[0]);
	console.log('MESSAGE ID LAST ONE KEYS ', message.channel.messages.cache.lastKey(1));
	console.log('MESSAGE ID LAST ONE KEYS[0] ', message.channel.messages.cache.lastKey(1)[0]);
	console.log('BOT CONVO MESSGAE ', botConvo.getCurrentMessage().id);
	console.log('BOT CONVO ARRAY ', botConvoState);
	// returns true if this message is a direct response to botConvo.current_message
	return (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id);
};