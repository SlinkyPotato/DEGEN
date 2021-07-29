/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/GuestPassService';
// import ScoapHttpServer from '../service/ScoapHttpServer';
import ScoapFastifyServer from '../service/ScoapFastifyServer';

module.exports = {
	name: 'ready',
	once: true,

	execute(client) {
		console.log('Discord bot ready!');
		client.user.setActivity('Going Bankless, Doing the DAO');
		GuestPassService(client);
		// ScoapHttpServer(client);
		ScoapFastifyServer();
	},
};