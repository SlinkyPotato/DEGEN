// Libs
import {
	SlashCreator,
	GatewayServer,
	SlashCommand,
	CommandContext,
	SlashCreatorOptions,
} from 'slash-create';
import Discord, { Client, ClientOptions, Intents, WSEventType } from 'discord.js';
import path from 'path';
import fs from 'fs';
import './utils/SentryUtils';
import Log, { LogUtils } from './utils/Log';
import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';
import constants from './service/constants/constants';

initializeSentryIO();
const client: Client = initializeClient();
initializeEvents();

const creator = new SlashCreator({
	applicationID: process.env.DISCORD_BOT_APPLICATION_ID,
	publicKey: process.env.DISCORD_BOT_PUBLIC_KEY,
	token: process.env.DISCORD_BOT_TOKEN,
} as SlashCreatorOptions);

creator.on('debug', (message) => Log.debug(`debug: ${ message }`));
creator.on('warn', (message) => Log.warn(`warn: ${ message }`));
creator.on('error', (error: Error) => Log.error(`error: ${ error }`));
creator.on('synced', () => Log.debug('Commands synced!'));
creator.on('commandRegister', (command: SlashCommand) => Log.debug(`Registered command ${command.commandName}`));
creator.on('commandError', (command: SlashCommand, error: Error) => Log.error(`Command ${command.commandName}:`, {
	indexMeta: true,
	meta: {
		name: error.name,
		message: error.message,
		stack: error.stack,
		command,
	},
}));

// Ran after the command has completed
creator.on('commandRun', (command:SlashCommand, result: Promise<any>, ctx: CommandContext) => {
	LogUtils.logCommandEnd(ctx);
});

// Register command handlers
creator
	.withServer(
		new GatewayServer((handler) => client.ws.on(<WSEventType>'INTERACTION_CREATE', handler)),
	)
	.registerCommandsIn(path.join(__dirname, 'commands'))
	.syncCommands();

// Log client errors
client.on('error', Log.error);

client.login(process.env.DISCORD_BOT_TOKEN).catch(Log.debug);

function initializeClient(): Client {
	const clientOptions: ClientOptions = {
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_BANS,
			Intents.FLAGS.GUILD_MEMBERS,
			Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.GUILD_PRESENCES,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.DIRECT_MESSAGES,
			Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		],
		partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'],
	};
	return new Discord.Client(clientOptions);
}

function initializeSentryIO() {
	Sentry.init({
		tracesSampleRate: 1.0,
		release: `${constants.APP_NAME}@${constants.APP_VERSION}`,
		environment: process.env.SENTRY_ENVIRONMENT,
		integrations: [
			new RewriteFrames({
				root: __dirname,
			}),
			new Sentry.Integrations.Http({ tracing: true }),
		],
	});
}

function initializeEvents(): void {
	const eventFiles = fs.readdirSync(path.join(__dirname, '/events')).filter(file => file.endsWith('.js'));
	eventFiles.forEach(file => {
		const event = new (require(`./events/${file}`).default)();
		try {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args, client));
			} else {
				client.on(event.name, (...args) => event.execute(...args, client));
			}
		} catch (e) {
			LogUtils.logError('event failed to process', e);
		}
	});
}

export default client;