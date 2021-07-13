// Libs
const { SlashCreator, GatewayServer } = require('slash-create');
const { getFiles } = require('./util/Utility');
const Discord = require('discord.js');
const path = require('path');

const client = new Discord.Client();

const creator = new SlashCreator({
	applicationID: process.env.DISCORD_BOT_APPLICATION_ID,
	publicKey: process.env.DISCORD_BOT_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
});

// Register command handlers
creator
	.withServer(
		new GatewayServer((handler) => client.ws.on('INTERACTION_CREATE', handler),
		),
	)
	.registerCommands(getFiles(path.join(__dirname, 'commands')).map(file => {
		return new (require(file))(creator, client);
	}),
	)
	.syncCommands();

// Register event handlers
getFiles(path.join(__dirname, 'events')).forEach(file => {
	const event = require(file);
	const eventName = file.substr(file.lastIndexOf('/')).replace('/', '').split('.')[0];
	if (event.once) {
		client.once(eventName, (...args) => event.execute(...args, client));
	} else {
		client.on(eventName, (...args) => event.execute(...args, client));
	}
});

// Handle command errors
creator.on('commandError', async (cmd, err, ctx) => {
	console.error(err);
	if (!ctx.expired && !ctx.initiallyResponded) {
		return ctx.send('An error occurred while running the command.', { ephemeral: true });
	}
});

// Log client errors
client.on('error', console.error);

client.login(process.env.DISCORD_BOT_TOKEN);
