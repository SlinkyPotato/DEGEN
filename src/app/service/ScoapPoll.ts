import { TextChannel } from 'discord.js';
import { FastifyRequest } from 'fastify'
import express = require('express');
import client from '../app'
import constants from './../constants';


const scoapEmbed = {
	color: 0x0099ff,
	title: 'SCOAP SQUAD - NEW WEBSITE',
	url: 'https://www.bankless.community',
	author: {
		name: 'Posted by user Tiki',
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

const updateEmbedFields = (emoji_name, embedFields) => {

	
	switch (true){
      case emoji_name === constants.EMOJIS.one:
      	{
      	let st = embedFields[1].name.match(/\(([^)]+)\)/)[1];
      	let current = st.split('/')[0];
      	let target = st.split('/')[1];
      	let newCurrent = parseInt(current) + 1;
      	let percent = Math.round(100/parseInt(target)*newCurrent);
      	let updateStr = `${percent}%(${newCurrent}/${target})`;
      	embedFields[1] =  {
				name: updateStr,
				value: '\u200b',
				inline: true,
		};
        return (embedFields);
	    };
	       
      case emoji_name === constants.EMOJIS.two:
      	{
      	let st = embedFields[4].name.match(/\(([^)]+)\)/)[1];
      	let current = st.split('/')[0];
      	let target = st.split('/')[1];
      	let newCurrent = parseInt(current) + 1;
      	let percent = Math.round(100/parseInt(target)*newCurrent);
      	let updateStr = `${percent}%(${newCurrent}/${target})`;
      	embedFields[4] =  {
				name: updateStr,
				value: '\u200b',
				inline: true,
		};
        return (embedFields);
	    };

       case emoji_name === constants.EMOJIS.three: 
       	{
      	let st = embedFields[7].name.match(/\(([^)]+)\)/)[1];
      	let current = st.split('/')[0];
      	let target = st.split('/')[1];
      	let newCurrent = parseInt(current) + 1;
      	let percent = Math.round(100/parseInt(target)*newCurrent);
      	let updateStr = `${percent}%(${newCurrent}/${target})`;
        embedFields[7] =  {
				name: updateStr,
				value: '\u200b',
				inline: true,
		};
        return (embedFields);
	    };

      default:
        console.log('This should never happen!');
    }

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
	
	// const four = client.emojis.cache.find(emoji => emoji.name === "like");
	// const four = client.emojis.find(emoji => emoji.name === "like");

	// Create a reaction collector
	const filter = (reaction) => reaction.emoji.name === constants.EMOJIS.one || reaction.emoji.name === constants.EMOJIS.two || reaction.emoji.name === constants.EMOJIS.three;
	const collector = embedMessage.createReactionCollector(filter, /*{ time: 10000 }*/ );
	collector.on('collect', async (reaction, user) => {

		// let msg = `Collected ${reaction.emoji.name} from user ${user.username}`
		// immutably copy embed's fields to new obj
		var embedFields = Object.assign([], embedMessage.embeds[0].fields);
		console.log('3', embedFields);
		// validate before running this!
		let updatedEmbedFields = updateEmbedFields(reaction.emoji.name, embedFields)
		console.log('4', updatedEmbedFields);
		scoapEmbed.fields = updatedEmbedFields
		embedMessage.edit({ embed: scoapEmbed });
		console.log(`Collected ${reaction.emoji.name} from user ${user.id}`)
	});

	collector.on('end', collected => console.log(`Collected ${collected.size} items`));
	

	return (request.body);
	
}

