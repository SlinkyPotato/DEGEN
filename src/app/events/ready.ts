/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/guest-pass/GuestPassService';
import ScoapFastifyServer from '../service/scoap-squad/ScoapFastifyServer';
import { Client } from 'discord.js';


module.exports = {
	name: 'ready',
	once: true,

	async execute(client: Client) {
		console.log('The Sun will never set on the DAO. Neither will I. DEGEN & Serendipity are ready for service.');
		client.user.setActivity('Going Bankless, Doing the DAO');
		await GuestPassService(client);
		ScoapFastifyServer();
	},
};

