const { Command } = require('discord.js-commando');
const notionPageRefs = require('../../api/notion/NotionGuildPages.js');

module.exports = class NotionGuildPages extends Command {
	constructor(client) {
		super(client, {
			name: 'notion-guild',
			aliases: ['notionguild'],
			group: 'notion',
			memberName: 'notion-guild',
			description: 'Retrieve the Guild\'s main Notion page.',
			args: [
				{
					key: 'guild',
					prompt: 'Which Guild\'s page would you like to see?',
					type: 'string',
				},
			],
		});
	}

	run(message, { guild }) {
		const guildNameToUppercase = guild[0].toUpperCase() + guild.slice(1);
		const page = notionPageRefs[guild];
		return message.say(`Here you are, ${message.author}: The ${guildNameToUppercase} Guild Notion Page: ${page}`);
	}
};