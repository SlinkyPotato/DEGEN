const client = require('./../app.js');
const db = require('./../db.js');
const constants = require('./../constants');

/**
 * Handle guest pass role service
 */
client.once('ready', () => {
	db.connect(process.env.MONGODB_URI, async (err) => {
		console.log('starting guest pass service...');
		if (err) {
			console.error('ERROR:', err);
			return;
		}
		
	});
});