/**
 * Handler for Discord event `ready`.
 */

const GuestPassService = require('../service/GuestPassService.js');

module.exports = {
	name: 'ready',
	once: true,

	execute(client) {
		console.log('Discord bot ready!');
		client.user.setActivity('Going Bankless, Doing the DAO');
		GuestPassService(client);
	},
};