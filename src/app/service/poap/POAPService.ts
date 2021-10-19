import { Client as DiscordClient, Guild, GuildMember } from 'discord.js';
import Log from '../../utils/Log';
import { Collection, Cursor, Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import dayjs from 'dayjs';
import EndPOAP from './EndPOAP';

const POAPService = async (client: DiscordClient): Promise<void> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const currentDateISO: string = dayjs().toISOString();
	Log.info(currentDateISO);
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
	
	for (const expiredEvent of expiredEventsList) {
		const poapGuild: Guild = await client.guilds.fetch(expiredEvent.discordServerId);
		const poapOrganizer: GuildMember = await poapGuild.members.fetch(expiredEvent.discordUserId);
		await EndPOAP(poapOrganizer);
	}

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

	for (const activeEvent of activeEventsList) {
		const expirationTimestamp: number = dayjs(activeEvent.endTime).unix();
		const expiresInMilli = Math.max(expirationTimestamp - Date.now(), 0);
		setTimeout(async () => {
			const poapGuild: Guild = await client.guilds.fetch(activeEvent.discordServerId);
			const poapOrganizer: GuildMember = await poapGuild.members.fetch(activeEvent.discordUserId);
			await EndPOAP(poapOrganizer);
		}, expiresInMilli);
	}
	Log.info('POAP service ready.');
	return;
};

export default POAPService;