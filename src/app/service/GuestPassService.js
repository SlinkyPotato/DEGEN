const db = require('./../db.js');
const constants = require('./../constants');

/**
 * Handle guest pass role service
 */
module.exports = (client) => {
	console.log('starting guest pass service...');
	// db.connect(process.env.MONGODB_URI, async (err) => {
	// if (err) {
	// 	console.error('ERROR:', err);
	// 	return;
	// }
	// const dbGuestUsers = db.get().collection(constants.DB_COLLECTION_GUEST_USERS);
	//
	// // Query all guest pass users from db
	// const dbCursor = dbGuestUsers.find();
	// const currentTimestamp = Date.now();
	// const listOfExpiredGuests = [];
	// const listOfActiveGuests = [];
	// dbCursor.forEach((guestUser) => {
	// 	if (guestUser.expiresTimestamp <= currentTimestamp) {
	// 		// Remove guest pass role from discord
	// 		listOfExpiredGuests.push({
	// 			id: guestUser._id,
	// 		});
	// 	}
	// 	else {
	// 		listOfActiveGuests.push({
	// 			id: guestUser._id,
	// 		});
	// 	}
	// });
	// dbCursor.close();

	// Begin removal of guest users
	console.log(client.users.fetch());
	// });
};
