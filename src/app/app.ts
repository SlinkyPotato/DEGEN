// Libs
import { SlashCreator, GatewayServer } from 'slash-create';
import Discord, {Client, ClientOptions, Intents, WSEventType} from 'discord.js';
import path from 'path';
import fs from 'fs';

const client: Client = initializeClient();
initializeEvents();

const creator = new SlashCreator({
	applicationID: process.env.DISCORD_BOT_APPLICATION_ID,
	publicKey: process.env.DISCORD_BOT_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
});

// Register command handlers
creator
	.withServer(
		new GatewayServer((handler) => client.ws.on(<WSEventType>'INTERACTION_CREATE', handler)),
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

function initializeClient(): Client {
	const clientOptions: ClientOptions = {
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.GUILD_PRESENCES,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.DIRECT_MESSAGES,
			Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		],
		partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
	};
	return new Discord.Client(clientOptions);
}

function initializeEvents(): void {
	const eventFiles = fs.readdirSync(path.join(__dirname, '/events')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = require(`./events/${file}`);
		try {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args, client));
			} else {
				client.on(event.name, (...args) => event.execute(...args, client));
			}
		} catch (e) {
			console.error(e);
		}
	});
}

export default client;