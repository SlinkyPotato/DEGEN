// Libs
import { SlashCreator, GatewayServer } from 'slash-create';
import Discord, { Client } from 'discord.js';
import path from 'path';
import fs from 'fs';

const client: Client = new Discord.Client();
initializeEvents();

const creator = new SlashCreator({
	applicationID: process.env.DISCORD_BOT_APPLICATION_ID,
	publicKey: process.env.DISCORD_BOT_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
});

// Register command handlers
creator
	.withServer(
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		new GatewayServer((handler) => client.ws.on('INTERACTION_CREATE', handler)),
	)
	.registerCommandsIn(path.join(__dirname, 'commands'))
	.syncCommands();

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

function initializeEvents() {
	const eventFiles = fs.readdirSync(path.join(__dirname, '/events')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = require(`./events/${file}`);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client));
		} else {
			client.on(event.name, (...args) => event.execute(...args, client));
		}
	});
}

module.exports.client = client;