import { scoapEmbedArray } from '../../service/scoap-squad/CreateNewScoapPoll';
import { Message } from 'discord.js';

export default async (message: Message): Promise<any> => {


	// Note - make sure to get rid of embedObject in array after scoap draft is completed
	const scoapEmbedIndex = scoapEmbedArray.map(function(x) {return x.current_channel; }).indexOf(message.channel);

	// not found
	if (scoapEmbedIndex === -1) return;

	const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
	console.log('this is the scoapEmbed ', scoapEmbed);
	console.log('received this message: ', message.content);
	return message.channel.send(`received input ${message.content}`);

	// return console.log('channel did not match ', message.channel, scoapEmbed.current_channel);
};