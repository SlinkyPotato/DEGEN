import { scoapEmbedArray, botConvoArray } from '../../service/scoap-squad/CreateNewScoapPoll';
import { Message } from 'discord.js';

export default async (message: Message): Promise<any> => {


	// Note - make sure to get rid of embedObject in array after scoap draft is completed

	// map message to correct scoapEmbed object
	// const scoapEmbedIndex = scoapEmbedArray.map(function(x) {return x.current_channel; }).indexOf(message.channel);
	const scoapEmbedIndex = scoapEmbedArray.map(embed => embed.current_channel).indexOf(message.channel);
	if (scoapEmbedIndex === -1) return;

	const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];

	console.log('received this message: ', message.content);
	console.log('last message (from message.channel): ', message.channel.lastMessageID);
	console.log('last message (from scoapEmbed.channel): ', scoapEmbed.getCurrentChannel().lastMessageID);
	console.log('this message: ', message.id);
	console.log('embedCurrentMessage: ', scoapEmbed.getCurrentMessage().id);
	console.log('embedCurrentChannel: ', scoapEmbed.getCurrentChannel().id);
	console.log('message channel: ', message.channel.id);
	console.log('last message Key: ', message.channel.messages.cache.lastKey());
	console.log('last message id: ', message.channel.messages.cache.last().id);

	// only respond if this message is a direct response to scoapEmbed.current_message
	if (message.channel.messages.cache.lastKey(2)[0] === scoapEmbed.getCurrentMessage().id) {
		return message.channel.send(`received input ${message.content}`);
	};

	return;

	// return console.log('channel did not match ', message.channel, scoapEmbed.current_channel);
};