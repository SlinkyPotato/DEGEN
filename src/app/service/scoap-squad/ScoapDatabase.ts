import dbInstance from '../../utils/db';
import { Db } from 'mongodb';
import cloneDeep from 'lodash.clonedeep';
import { ScoapEmbed, VoteRecord } from './ScoapClasses';
import client, { scoapEmbedState, voteRecordState } from '../../app';
// import constants from '../constants/constants';
import { TextChannel } from 'discord.js';
import channelIds from '../constants/channelIds';
import ScoapUtils from '../../utils/ScoapUtils';

// const bountyCollection: BountyCollection = await dbCollection.findOne({
// 		_id: new mongo.ObjectId(bountyId),
// 	});


// const dbInsertResult = await dbBounty.insertMany(listOfPrepBounties, { ordered: false });
// if (dbInsertResult == null) {
// 	console.error('failed to insert bounties into DB');
// 	return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
// }

const decircularizeScoapEmbed = (scoapEmbed) => {
	const clone = cloneDeep(scoapEmbed);
	clone.setCurrentMessage(scoapEmbed.getCurrentMessage().id);
	clone.setCurrentChannel(scoapEmbed.getCurrentChannel().id);
	return clone;

};


export const updateScoapEmbedAndVoteRecordDb = async (scoapEmbed, voteRecord) => {
	const clone = decircularizeScoapEmbed(scoapEmbed);
	const filter = { id: scoapEmbed.getId() };
	const options = { upsert: true };
	const updateDoc = { $set: { scoapEmbed: clone, voteRecord: voteRecord } };
	const db: Db = await dbInstance.dbConnect('degen');
	const dbScoap = db.collection('scoapSquad');
	const dbInsertResult = await dbScoap.updateOne(filter, updateDoc, options);
	ScoapUtils.logToFile(`Mongo updated, id: ${scoapEmbed.getId()}`);
	// console.log(dbInsertResult);
};

export const restoreScoapEmbedAndVoteRecord = async () => {
	const db: Db = await dbInstance.dbConnect('degen');
	const dbScoap = db.collection('scoapSquad').find({});
	const dataArray = await dbScoap.toArray();
	if (dataArray.length > 0) {
		for (const entry of dataArray) {
			// console.log(entry);
			const scoapEmbed = entry.scoapEmbed;
			scoapEmbed.__proto__ = ScoapEmbed.prototype;
			const voteRecord = entry.voteRecord;
			voteRecord.__proto__ = VoteRecord.prototype;
			// console.log('SCOAP MSG ID FROM METHOD ', scoapEmbed.getCurrentMessage());
			// console.log('VOTE R ID FROM METHOD ', voteRecord.getId());
			const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
			const embedMessages = await scoapChannel.messages.fetch(scoapEmbed.getCurrentMessage());
			scoapEmbed.setCurrentChannel(scoapChannel);
			scoapEmbed.setCurrentMessage(embedMessages);
			scoapEmbedState[scoapEmbed.getId()] = scoapEmbed;
			voteRecordState[scoapEmbed.getId()] = voteRecord;
			// console.log('SCOAP MSG ID FROM METHOD ', scoapEmbed.getCurrentMessage().id);
			ScoapUtils.logToFile(`Restored two objects (scoapEMbed & voteRecord) from Mongo, id: ${scoapEmbed.getId()}`);
			return true;
		}
	} else {
		console.log('No uncompleted poll data in mongo to restore');
		return false;
	}
};

export const deleteScoapEmbedAndVoteRecord = async (scoap_embed_id) => {
	const db: Db = await dbInstance.dbConnect('degen');
	await db.collection('scoapSquad').deleteMany({ id: scoap_embed_id });
	ScoapUtils.logToFile(`Document removed from Mongo, id: , ${scoap_embed_id}`);
};