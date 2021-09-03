/**
 * Handler for Discord event `ready`.
 */

import GuestPassService from '../service/guest-pass/GuestPassService';
// import ScoapFastifyServer from '../service/scoap-squad/ScoapFastifyServer';
import { Client, TextChannel } from 'discord.js';
import constants from '../service/constants/constants';
import { connect } from '../utils/db';

// import ScoapUtils from '../utils/ScoapUtils';
import dbInstance from '../utils/db';
import { Db } from 'mongodb';


const filter = (reaction, user) => {
	// const emoji_valid = emojiValid(reaction.emoji.name, validEmojiArray);
	// const bot_reaction = user.bot;
	return true;
};


module.exports = {
	name: 'ready',
	once: true,

	async execute(client: Client) {
		console.log('The Sun will never set on the DAO. Neither will I. DEGEN & Serendipity are ready for service.');
		client.user.setActivity('Going Bankless, Doing the DAO');
		await connect(constants.DB_NAME_DEGEN);
		await connect(constants.DB_NAME_BOUNTY_BOARD);
		await GuestPassService(client);
		// ScoapFastifyServer();




	// 	const chan: TextChannel = await client.channels.fetch('872270622070308895') as TextChannel;
	// 	const lastMsgId = chan.lastMessageId;
	// 	// console.log(chan);
	// 	console.log(lastMsgId);
	// 	// console.log(chan.messages.cache);
	// 	const lstMsg = await chan.messages.fetch(lastMsgId);
	// 	console.log(lstMsg.reactions.cache);
	// 	for (const [key, message_reaction] of lstMsg.reactions.cache) {
	// 		// console.log(message_reaction.values());
	// 		// console.log(message_reaction['1️⃣']);
	// 		console.log('KEY', key);
	// 		console.log('VALUE', message_reaction);
	// 		console.log('VALUE', message_reaction.users);
	// 		console.log('VALUE', message_reaction[0]);
	// 		console.log('VALUE', await message_reaction.users.fetch());
	// 		console.log('VALUE', message_reaction.users.cache);
	// 		await message_reaction.users.fetch();
	// 		for (const [k, val] of message_reaction.users.cache) {
	// 			// for (r of reac.values()) {
	// 			// 	console.log(r);
	// 			// }
	// 			console.log('KEY', k);
	// 			console.log('VAL', val);	// const db: Db = await dbInstance.dbConnect('degen');
	// // const dbScoap = db.collection('scoapSquad');
	// // const dbInsertResult = await dbScoap.insertOne(json);
	// // console.log(dbInsertResult);
	// 			// console.log(reac.emoji.name);
	// 			// console.log(reac.users);
	// 			// console.log('SNOWFLAKE,USER ', user);
	// 			// console.log('snowflake', user[0]);
	// 			// console.log('int of snowflake', parseInt(user[0]));
	// 			// console.log('bin of snowflake', dec2bin(parseInt(user[0])));
	// 		}
	// 	}
	// 	const collector = await lstMsg.createReactionCollector({
	// 		filter,
	// 		dispose: true,
	// 		time: constants.SCOAP_POLL_TIMEOUT_MS,
	// 	});

	// 	console.log(collector.collected);
	// 	const tikiid = '749152252966469668';
	// 	const tikiuser = await client.users.fetch(tikiid);
	// 	// const tikiuser = usrss.get(tikiid);
	// 	console.log(tikiuser);
	// 	console.log(lstMsg.reactions.cache.random());
	// 	// const valid_reactions = lstMsg.reactions.cache.filter(id => reaction_users.indexOf(id) !== -1);
	// 	collector.collected.set(tikiid, lstMsg.reactions.cache.random());
	// 	console.log(collector.collected);


	// 	// const fltr = { id: tikiid };
	// 	// const options = { upsert: true };
	// 	// const updateDoc = { $set: { collected: collector.collected } };
	// 	// const db: Db = await dbInstance.dbConnect('degen');
	// 	// const dbScoap = db.collection('scoapSquad');
	// 	// const dbInsertResult = await dbScoap.updateOne(fltr, updateDoc, options);
	// 	// console.log(`COLLECTION Mongo updated, id: ${tikiid}`);

		
		
	},
};

