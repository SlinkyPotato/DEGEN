/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/guest-pass/GuestPassService';
import ScoapFastifyServer from '../service/scoap-squad/ScoapFastifyServer';

module.exports = {
	name: 'ready',
	once: true,

	async execute(client) {
		console.log('Discord bot ready!');
		client.user.setActivity('Going Bankless, Doing the DAO');
		await GuestPassService(client);
		ScoapFastifyServer();
	},
};