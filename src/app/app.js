// Libs
const { CommandoClient } = require('discord.js-commando');

const path = require('path');
const fs = require('fs');

const client = new CommandoClient({
	commandPrefix: '$',
	owner: process.env.DISCORD_OWNER_ID,
});

client.registry
	.registerDefaultTypes()
	.registerGroups([
		['admin', 'Commands for admin automation'],
		['notion', 'Commands for interacting with the Notion API'],
		['bounty board', 'Commands for Bounty Board Workflow Management'],
		['governance', 'Commands for governance integrations'],
	])
	.registerDefaultGroups()
	.registerCommandsIn(path.join(__dirname, 'commands'));

// basic error monitoring
client.on('error', console.error);

// Register event handlers
fs.readdir(path.join(__dirname, 'events'), (err, files) => {
	if (err) return console.error(err);
	files.forEach(file => {
		if (!file.endsWith(".js")) return;
		const event = require(`./events/${file}`);
		let eventName = file.split(".")[0];
		if (event.once) {
			client.once(eventName, (...args) => event.execute(...args, client));
		} else {
			client.on(eventName, (...args) => event.execute(...args, client));
		}
	});
});

client.login(process.env.DISCORD_BOT_TOKEN);
