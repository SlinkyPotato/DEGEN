const db = require('./../db.js');
const constants = require('./../constants');
const sleep = require('util').promisify(setTimeout);

/**
 * Handle guest pass role service
 */
module.exports = async (client) => {
	console.log('starting guest pass service...');

	// Retrive guild
	const guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);
	
	// Retrieve Guest Pass Role
	const guestRole = guild.roles.cache.find((role) => {
		return role.name === constants.DISCORD_ROLE_GUEST_PASS;
	});
	
	db.connect(process.env.MONGODB_URI, async (err) => {
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
			}
			else {
				// Add active guests to list
				listOfActiveGuests.push(guestUser._id);
			}
		});

		// Begin removal of guest users
		listOfExpiredGuests.forEach(async (expiredUserId) => {
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
				return;
			}
			console.log(`guest pass removed for ${expiredUserId} in db`);

			guildMember.send(`Hi <@${expiredUserId}>, your guest pass has expired. Let us know at Bankless DAO if you have any questions!`);

			// discord api rate limit of 50 calls per second
			await sleep(1000);
		});

		// Begin reminder of active guest users
		listOfActiveGuests.forEach((activeUserId) => {
			console.log(activeUserId);
		});
		console.log('done guest pass service setup.');
	});
};
