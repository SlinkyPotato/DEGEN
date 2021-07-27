/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/GuestPassService';
import HttpServer from '../service/HttpServer';

module.exports = {
	name: 'ready',
	once: true,

	execute(client) {
		console.log('Discord bot ready!');
		client.user.setActivity('Going Bankless, Doing the DAO');
		GuestPassService(client);
		HttpServer(client);
	},
};