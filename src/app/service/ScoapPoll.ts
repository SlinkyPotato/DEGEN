import { TextChannel } from 'discord.js';
import { FastifyRequest } from 'fastify'
import express = require('express');
import client from '../app'
import constants from './../constants';

// const fastify = require('fastify');
// import { Server, IncomingMessage, ServerResponse } from 'http'
// import ReplyDefault, { RequestGenericInterface } from 'fastify'


// interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface {}
// interface ReplyGenericInterface {
//   Reply?: typeof ReplyDefault;
// }
// FastifyRequest<RouteGenericInterface, Server, IncomingMessage>



const exampleEmbed = {
	color: 0x0099ff,
	title: 'Some title',
	url: 'https://discord.js.org',
	author: {
		name: 'Some name',
		icon_url: 'https://i.imgur.com/wSTFkRM.png',
		url: 'https://discord.js.org',
	},
	description: 'Some description here',
	thumbnail: {
		url: 'https://i.imgur.com/wSTFkRM.png',
	},
	fields: [
		{
			name: 'Regular field title',
			value: 'Some value here',
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
	],
	image: {
		url: 'https://i.imgur.com/wSTFkRM.png',
	},
	timestamp: new Date(),
	footer: {
		text: 'Some footer text here',
		icon_url: 'https://i.imgur.com/wSTFkRM.png',
	},
};

//Note: How to do correct type definition for request?
export default async (channel: TextChannel, request: any): Promise<any> => {
	console.log(' here is the request body ', request.body)
	const pollMessage = await channel.send({ embed: exampleEmbed });
	// const pollMessage = await channel.send(request.body.scoap);
	// await pollMessage.react(`✅`);
	// await pollMessage.react(`⛔`);
	await pollMessage.react(constants.EMOJIS.one);
	await pollMessage.react(constants.EMOJIS.two);
	await pollMessage.react(constants.EMOJIS.three);
	await pollMessage.react(constants.EMOJIS.four);
	await pollMessage.react(constants.EMOJIS.five);
	await pollMessage.react(constants.EMOJIS.six);
	await pollMessage.react(constants.EMOJIS.seven);
	await pollMessage.react(constants.EMOJIS.eight);
	await pollMessage.react(constants.EMOJIS.nine);
	// await pollMessage.react(String.fromCodePoint(0x1F354));
	// await pollMessage.react(String.fromCodePoint(0x0031));
	
	
	
	// const four = client.emojis.cache.find(emoji => emoji.name === "like");
	// const four = client.emojis.find(emoji => emoji.name === "like");
	

	// await pollMessage.react(four);

	// Create a reaction collector
	// const filter = (reaction) => reaction.emoji.name === '✅';
	// const collector = pollMessage.createReactionCollector(filter, { time: 10000 });
	// collector.on('collect', async (reaction, user) => {
	//   console.log(`Collected ${reaction.emoji.name} from user ${user.id}`)
	//   let msg = `Collected ${reaction.emoji.name} from user ${user.username}`
	//   const pollMessage = await channel.send(msg);
	// });

	// collector.on('end', collected => console.log(`Collected ${collected.size} items`));
	return (request.body);
	
}

