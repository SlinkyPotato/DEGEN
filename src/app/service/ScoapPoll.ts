import { TextChannel } from 'discord.js';
import express = require('express');



export default async (channel: TextChannel, request: express.Request): Promise<string> => {
	console.log(' here is the request body ', request.body)

	const pollMessage = await channel.send(request.body.scoap);
	await pollMessage.react(`✅`);
	await pollMessage.react(`⛔`);
	// Create a reaction collector
	const filter = (reaction) => reaction.emoji.name === '✅';
	const collector = pollMessage.createReactionCollector(filter, { time: 30000 });
	collector.on('collect', async (reaction, user) => {
	  console.log(`Collected ${reaction.emoji.name} from user ${user.id}`)
	  let msg = `Collected ${reaction.emoji.name} from user ${user.username}`
	  const pollMessage = await channel.send(msg);
	});

	collector.on('end', collected => console.log(`Collected ${collected.size} items`));
	return (request.body.scoap);

	// if (request.body.scoap instanceof String) {
	// 	return (request.body.scoap);
	// } else {
	// 	return ('nothing')
	// }
	
}