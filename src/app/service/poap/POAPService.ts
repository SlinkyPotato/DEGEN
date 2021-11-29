import { Client as DiscordClient, Guild, GuildChannel, GuildMember } from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import { Collection, Cursor, Db } from 'mongodb';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import dayjs from 'dayjs';
import EndPOAP from './EndPOAP';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { POAPTwitterSettings } from '../../types/poap/POAPTwitterSettings';
import { storePresentMembers } from './start/StartPOAP';

const POAPService = {
	runAutoEndSetup: async (client: DiscordClient, platform: string): Promise<void> => {
		Log.debug(`starting autoend setup for ${platform}`);
		
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		let poapSettingsDB: Collection;
		
		switch (platform) {
		case constants.PLATFORM_TYPE_DISCORD:
			poapSettingsDB = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
			break;
		case constants.PLATFORM_TYPE_TWITTER:
			poapSettingsDB = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
			break;
		default:
			throw new Error('Unsupported platform');
		}
		
		const currentDateISO: string = dayjs().toISOString();
		const poapSettingsExpiredEventsCursor: Cursor<POAPSettings | POAPTwitterSettings> = await poapSettingsDB.find({
			isActive: true,
			endTime: {
				$lte: currentDateISO,
			},
		});

		const expiredEventsList: any[] = [];
		await poapSettingsExpiredEventsCursor.forEach((poapSettings: POAPSettings | POAPTwitterSettings) => {
			expiredEventsList.push(poapSettings);
		});
		Log.debug(`found ${expiredEventsList.length} expired events in ${platform}`);
		for (const expiredEvent of expiredEventsList) {
			const poapGuild: Guild = await client.guilds.fetch(expiredEvent.discordServerId);
			const poapOrganizer: GuildMember = await poapGuild.members.fetch(expiredEvent.discordUserId);
			await EndPOAP(poapOrganizer, platform);
		}
		Log.debug(`all expired events ended for ${platform}`);
		const poapSettingsActiveEventsCursor: Cursor<POAPSettings | POAPTwitterSettings> = await poapSettingsDB.find({
			isActive: true,
			endTime: {
				$gte: currentDateISO,
			},
		});

		const activeEventsList: any[] = [];
		await poapSettingsActiveEventsCursor.forEach((poapSettings: POAPSettings | POAPTwitterSettings) => {
			activeEventsList.push(poapSettings);
		});
		Log.debug(`found ${activeEventsList.length} active events for ${platform}`);

		for (const activeEvent of activeEventsList) {
			if (platform == constants.PLATFORM_TYPE_DISCORD) {
				try {
					const guild: Guild = await client.guilds.fetch(activeEvent.discordServerId);
					const channelChoice: GuildChannel = await guild.channels.fetch(activeEvent.voiceChannelId);
					await storePresentMembers(db, channelChoice).catch();
				} catch (e) {
					LogUtils.logError('failed trying to store present members for active poap event', e);
				}
			}
			POAPService.setupAutoEndForEvent(client, activeEvent, platform);
		}
		Log.debug(`POAP service ready for ${platform}`);
	},
	
	setupAutoEndForEvent: (client: DiscordClient, activeEvent: POAPSettings | POAPTwitterSettings, platform: string): void => {
		Log.debug('setting up automatic end...');
		const currentDate = dayjs();
		const expirationTimestamp: number = dayjs(activeEvent.endTime).unix();
		const expiresInMilli = Math.max(expirationTimestamp - currentDate.unix(), 0) * 1000;
		setTimeout(async () => {
			const poapGuild: Guild = await client.guilds.fetch(activeEvent.discordServerId);
			const poapOrganizer: GuildMember = await poapGuild.members.fetch(activeEvent.discordUserId);
			try {
				await EndPOAP(poapOrganizer, platform).catch(e => LogUtils.logError('failed to automatically end event', e));
			} catch (e) {
				LogUtils.logError('failed end poap event', e);
			}
		}, expiresInMilli);
		Log.debug(`auto end setup for ${activeEvent.event}`, {
			indexMeta: true,
			meta: {
				discordServerId: activeEvent.discordServerId,
				discordUserId: activeEvent.discordUserId,
				event: activeEvent.event,
			},
		});
	},
};

export default POAPService;