import db from '../utils/db';
import constants from './../constants';
import sleepTimer from 'util';
import { Client } from '@notionhq/client';
import { Client as DiscordClient, Role, RoleManager } from 'discord.js';
import { MongoError } from 'mongodb';
import { Page } from '@notionhq/client/build/src/api-types';

const sleep = sleepTimer.promisify(setTimeout);
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Handle guest pass role background service
 */
export default async (client: DiscordClient): Promise<void> => {
	console.log('starting guest pass service...');

	// Retrieve guild
	const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);

	// Retrieve Guest Pass Role
	const guestRole = await module.exports.retrieveGuestRole(guild.roles);

	db.connect(constants.DB_NAME_DEGEN, async (err: MongoError) => {
		if (err) {
			console.error('ERROR:', err);
			return;
		}

		const dbGuestUsers = db.get().collection(constants.DB_COLLECTION_GUEST_USERS);

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
			console.log('expired userid: ' + expiredUserId);

			const guildMember = await guild.members.fetch(expiredUserId);
			await guildMember.roles.remove(guestRole).catch(console.error);

			console.log(`guest pass removed for ${expiredUserId} in discord`);

			const guestDBQuery = {
				_id: expiredUserId,
			};
			const dbDeleteResult = await dbGuestUsers.findOneAndDelete(guestDBQuery);
			if (dbDeleteResult == null) {
				console.error('Failed to remove user from DB');
				continue;
			}
			await db.close();
			console.log(`guest pass removed for ${expiredUserId} in db`);

			await guildMember.send(`Hi <@${expiredUserId}>, your guest pass has expired. Let us know at Bankless DAO if you have any questions!`);

			// discord api rate limit of 50 calls per second
			await sleep(1000);
		}

		// Begin reminder of active guest users
		for (const activeUser of listOfActiveGuests) {
			console.log('active userid: ' + activeUser._id);

			const expiresInMilli = Math.max(activeUser.expiresTimestamp - Date.now(), 0);

			// Send out reminder for user
			setTimeout(async () => {
				const guildMember = await guild.members.fetch(activeUser._id);
				guildMember.send(`Hey <@${activeUser._id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!`);

				// Discord api rate limit of 50 calls per second
				await sleep(1000);
			}, Math.max(expiresInMilli - (1000 * 60 * 15), 0));

			// Remove user's guest pass
			setTimeout(async () => {
				const guildMember = await guild.members.fetch(activeUser._id);
				await guildMember.roles.remove(guestRole).catch(console.error);

				console.log(`guest pass removed for ${activeUser._id} in discord`);

				const guestDBQuery = {
					_id: activeUser._id,
				};
				const dbDeleteResult = await dbGuestUsers.findOneAndDelete(guestDBQuery);
				if (dbDeleteResult == null) {
					console.error('Failed to remove user from DB');
					return;
				}
				console.log(`guest pass removed for ${activeUser._id} in db`);

				await guildMember.send(`Hi <@${activeUser._id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!`);

				// Discord api rate limit of 50 calls per second
				await sleep(1000);
			}, expiresInMilli);

		}
		console.log('guest pass service ready.');
	});
};

// Retrieve the Guest Pass Role from guild
export function retrieveGuestRole(roles: RoleManager): Role {
	return roles.cache.find((role) => {
		return role.id === process.env.DISCORD_ROLE_GUEST_PASS;
	});
}

/**
 * Creates or updates page in Notion guest pass database.
 *
 * @param {string} tag Discord tag (e.g. hydrabolt#0001)
 * @param {boolean} activeGuestPass	Indicates if user has active guest pass
 */
export async function updateNotionGuestPassDatabase(tag: string, activeGuestPass: boolean): Promise<void> {
	// Check if page exists
	const page = await module.exports.findGuestPassPageByDiscordTag(tag);

	// Update page if exists, otherwise create new page
	if (page) {
		await notion.pages.update({
			page_id: page.id,
			properties: {
				'Guest Pass': {
					checkbox: activeGuestPass,
					type: 'checkbox',
				},
			},
		});
	} else {
		await notion.pages.create({
			parent: {
				database_id: process.env.NOTION_GUEST_PASS_DATABASE_ID,
			},
			properties: {
				'Discord Tag': {
					title: [
						{
							text: {
								content: tag,
							},
							type: 'text',
						},
					],
					type: 'title',
				},
				Date: {
					date: {
						start: new Date().toISOString().split('T')[0],
					},
					type: 'date',
				},
				'Guest Pass': {
					checkbox: activeGuestPass,
					type: 'checkbox',
				},
			},
		});
	}
}

/**
 * Return notion page from Guest Pass database for Discord tag
 *
 * @param {string} tag Discord tag (e.g. hydrabolt#0001)
 */
module.exports.findGuestPassPageByDiscordTag = async (tag: string): Promise<Page> => {
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
