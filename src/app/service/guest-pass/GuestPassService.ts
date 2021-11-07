import constants from '../constants/constants';
import { Client } from '@notionhq/client';
import { Client as DiscordClient } from 'discord.js';
import { Page } from '@notionhq/client/build/src/api-types';
import { Db } from 'mongodb';
import ServiceUtils from '../../utils/ServiceUtils';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Handle guest pass role background service
 */
export default async (client: DiscordClient): Promise<void> => {

	// Retrieve guild
	const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

	// Retrieve Guest Pass Role
	const guestRole = ServiceUtils.getGuestRole(guild.roles);

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const dbGuestUsers = db.collection(constants.DB_COLLECTION_GUEST_USERS);

	// Query all guest pass users from db
	const dbCursor = dbGuestUsers.find({});
	const currentTimestamp = Date.now();
	const listOfExpiredGuests = [];
	const listOfActiveGuests = [];
	await dbCursor.forEach((guestUser) => {
		if (guestUser.expiresTimestamp <= currentTimestamp) {
			// Add expired guests to list
			listOfExpiredGuests.push(guestUser._id);
		} else {
			// Add active guests to list
			listOfActiveGuests.push(guestUser);
		}
	});

	// Begin removal of guest users
	for (const expiredUserId of listOfExpiredGuests) {
		Log.debug('expired userid: ' + expiredUserId);
		try {
			const guildMember = await guild.members.fetch(expiredUserId);
			await guildMember.roles.remove(guestRole).catch(e => LogUtils.logError('failed to remove role', e));

			Log.debug(`guest pass removed for ${expiredUserId} in discord`);

			const guestDBQuery = {
				_id: expiredUserId,
			};
			const dbDeleteResult = await dbGuestUsers.findOneAndDelete(guestDBQuery);
			if (dbDeleteResult == null) {
				Log.error('Failed to remove user from DB');
				continue;
			}
			Log.debug(`guest pass removed for ${expiredUserId} in db`);
		} catch (e) {
			LogUtils.logError('failed to remove expired userid', e);
		}
	}

	// Begin reminder of active guest users
	for (const activeUser of listOfActiveGuests) {
		try {
			Log.debug('active userid: ' + activeUser._id);

			const expiresInMilli = Math.max(activeUser.expiresTimestamp - Date.now(), 0);

			// Send out reminder for user
			setTimeout(async () => {
				const guildMember = await guild.members.fetch(activeUser._id);
				await guildMember.send({ content: `Hey <@${activeUser._id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!` }).catch(e => LogUtils.logError('failed to messager guest user', e));
				
			}, Math.max(expiresInMilli - (1000 * 60 * 15), 0));

			// Remove user's guest pass
			setTimeout(async () => {
				const guildMember = await guild.members.fetch(activeUser._id);
				await guildMember.roles.remove(guestRole).catch(e => LogUtils.logError('failed to remove role', e));

				Log.debug(`guest pass removed for ${activeUser._id} in discord`);

				const guestDBQuery = {
					_id: activeUser._id,
				};
				const timeoutDB: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
				const timeoutDBGuestUsers = timeoutDB.collection(constants.DB_COLLECTION_GUEST_USERS);
				const dbDeleteResult = await timeoutDBGuestUsers.findOneAndDelete(guestDBQuery);
				if (dbDeleteResult == null) {
					Log.error('Failed to remove user from DB');
					return;
				}
				Log.debug(`guest pass removed for ${activeUser._id} in db`);
				
			}, expiresInMilli);
		} catch (e) {
			LogUtils.logError('failed to set reminder for guest user', e);
		}
	}
	Log.debug('Guest pass service ready.');
};

/**
 * Return notion page from Guest Pass database for Discord tag
 *
 * @param {string} tag Discord tag (e.g. hydrabolt#0001)
 */
module.exports.findGuestPassPageByDiscordTag = async (tag: string): Promise<Page> => {
	Log.log('finding guest pass page by discord tag');
	const response = await notion.databases.query({
		database_id: process.env.NOTION_GUEST_PASS_DATABASE_ID,
		filter: {
			property: 'Discord Tag',
			text: {
				equals: tag,
			},
		},
	});

	return response.results[0];
};
