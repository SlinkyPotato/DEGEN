import {
	Client,
	Collection,
	OAuth2Guild,
	Snowflake,
} from 'discord.js';
import constants from '../service/constants/constants';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log, { LogUtils } from '../utils/Log';
import POAPService from '../service/poap/POAPService';
import MongoDbUtils from '../utils/MongoDbUtils';
import { DiscordServerCollection } from '../types/discord/DiscordServerCollection';
import { Db } from 'mongodb';

export default class implements DiscordEvent {
	name = 'ready';
	once = true;

	async execute(client: Client): Promise<any> {
		try {
			Log.info('Starting up degen-tbd');
			
			if (client.user) {
				Log.debug(`setting status: ${process.env.DISCORD_BOT_ACTIVITY}`);
				client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY as string);
			}
			const db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
			await updateActiveDiscordServers(client, db);
			await POAPService.runAutoEndSetup(client, constants.PLATFORM_TYPE_DISCORD).catch(Log.error);
			await POAPService.runAutoEndSetup(client, constants.PLATFORM_TYPE_TWITTER).catch(Log.error);
			await POAPService.clearExpiredPOAPs();
			
			Log.info('degen-tbd is ready!');
		} catch (e) {
			LogUtils.logError('Error processing event ready', e);
		}
	}
}

const updateActiveDiscordServers = async (client: Client, db: Db) => {
	const guilds: Collection<Snowflake, OAuth2Guild> = await client.guilds.fetch();
	const discordServerCollection = await db.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
	await discordServerCollection.updateMany({}, {
		$set: {
			isDEGENActive: false,
		},
	});
	for await (const guild of guilds.values()) {
		Log.info(`DEGEN active for: ${guild.id}, ${guild.name}`);
		await discordServerCollection.updateOne({
			serverId: guild.id.toString(),
		}, {
			$set: {
				serverId: guild.id.toString(),
				name: guild.name,
				isDEGENActive: true,
			},
		}, {
			upsert: true,
		});
	}
};
