import { Client as DiscordClient, Guild, GuildMember } from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import { Collection, Cursor, Db } from 'mongodb';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import dayjs from 'dayjs';
import EndPOAP from './EndPOAP';
import MongoDbUtils from '../../utils/dbUtils';

const POAPService = {
	run: async (client: DiscordClient): Promise<void> => {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
		const currentDateISO: string = dayjs().toISOString();
		const poapSettingsExpiredEventsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
			isActive: true,
			endTime: {
				$lte: currentDateISO,
			},
		});

		const expiredEventsList: POAPSettings[] = [];
		await poapSettingsExpiredEventsCursor.forEach((poapSettings: POAPSettings) => {
			expiredEventsList.push(poapSettings);
		});
		Log.debug(`found ${expiredEventsList.length} expired events`);
		for (const expiredEvent of expiredEventsList) {
			const poapGuild: Guild = await client.guilds.fetch(expiredEvent.discordServerId);
			const poapOrganizer: GuildMember = await poapGuild.members.fetch(expiredEvent.discordUserId);
			await EndPOAP(poapOrganizer);
		}
		Log.debug('expired events ended');
		const poapSettingsActiveEventsCursor: Cursor<POAPSettings> = await poapSettingsDB.find({
			isActive: true,
			endTime: {
				$gte: currentDateISO,
			},
		});

		const activeEventsList: POAPSettings[] = [];
		await poapSettingsActiveEventsCursor.forEach((poapSettings: POAPSettings) => {
			activeEventsList.push(poapSettings);
		});
		Log.debug(`found ${activeEventsList.length} active events`);

		for (const activeEvent of activeEventsList) {
			POAPService.setupAutoEndForEvent(client, activeEvent);
		}
		Log.debug('active events prepared to automatic end');

		Log.debug('POAP service ready.');
		return;
	},
	
	setupAutoEndForEvent: (client: DiscordClient, activeEvent: POAPSettings): void => {
		const currentDate = dayjs();
		const expirationTimestamp: number = dayjs(activeEvent.endTime).unix();
		const expiresInMilli = Math.max(expirationTimestamp - currentDate.unix(), 0) * 1000;
		setTimeout(async () => {
			const poapGuild: Guild = await client.guilds.fetch(activeEvent.discordServerId);
			const poapOrganizer: GuildMember = await poapGuild.members.fetch(activeEvent.discordUserId);
			try {
				await EndPOAP(poapOrganizer).catch(e => LogUtils.logError('failed to autoend event', e));
			} catch (e) {
				LogUtils.logError('failed end poap event', e);
			}
		}, expiresInMilli);
		Log.debug(`auto end setup for ${activeEvent.voiceChannelName}`, {
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