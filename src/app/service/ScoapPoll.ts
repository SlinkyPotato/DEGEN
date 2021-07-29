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

const scoapEmbed = {
	color: 0x0099ff,
	title: 'SCOAP SQUAD - NEW WEBSITE',
	url: 'https://www.bankless.community',
	author: {
		name: 'Posted by user Tiki',
		// icon_url: '../../../docs/images/logo.svg',
		url: 'https://www.bankless.community',
	},
	description: 'Project Summary',
	fields: [
		{
			name: `${constants.EMOJIS.one} PM`,
			value: '\u200b',
			inline: true,
		},

		{
			name: '0 % (0/1)',
			value: '\u200b',
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: `${constants.EMOJIS.two} DEV`,
			value: 'JS, Web3',
			inline: true,
		},
		{
			name: '0% (0/3)',
			value: '\u200b',
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: `${constants.EMOJIS.three} UI`,
			value: 'Chakra',
			inline: true,
		},
		{
			name: '0% (0/2)',
			value: '\u200b',
			inline: true,
		},
	],
	timestamp: new Date(),
	footer: {
		text: 'You may select only one option in this poll',
	},
};

//Note: How to do correct type definition for request?
export default async (channel: TextChannel, request: any): Promise<any> => {
	console.log(' here is the request body ', request.body)
	// const pollMessage = await channel.send('a poll');
	const embedMessage = await channel.send({ embed: scoapEmbed });
	// const pollMessage = await channel.send(request.body.scoap);
	
	await embedMessage.react(constants.EMOJIS.one);
	await embedMessage.react(constants.EMOJIS.two);
	await embedMessage.react(constants.EMOJIS.three);

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

