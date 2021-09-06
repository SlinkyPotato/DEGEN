import dbInstance from '../../utils/db';
import { Db } from 'mongodb';
import cloneDeep from 'lodash.clonedeep';
import { ScoapEmbed, VoteRecord } from './ScoapClasses';
import client, { scoapEmbedState, voteRecordState } from '../../app';
// import constants from '../constants/constants';
import { TextChannel } from 'discord.js';
import channelIds from '../constants/channelIds';
import ScoapUtils from '../../utils/ScoapUtils';
import constants from '../constants/constants';
import { createReactionCollector, collectReactions } from './ScoapPoll';


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
	await dbScoap.updateOne(filter, updateDoc, options);
	ScoapUtils.logToFile(`Mongo updated, id: ${scoapEmbed.getId()}`);
};

const restoreReactionCollector = async (scoapEmbed, voteRecord) => {
	const validEmojiArray = cloneDeep(scoapEmbed.getVotableEmojiArray());
	validEmojiArray.push(constants.EMOJIS.cross_mark);
	const timeout = constants.SCOAP_POLL_TIMEOUT_MS - (+new Date() - scoapEmbed.getPublishedTimestamp());
	const collector = createReactionCollector(scoapEmbed.getCurrentMessage(), validEmojiArray, timeout);
	const embedMessage = scoapEmbed.getCurrentMessage();
	for (const [emoji, message_reaction] of embedMessage.reactions.cache) {
		for (const [user_id, user] of await message_reaction.users.fetch()) {
			if ((emoji in scoapEmbed.getReactionUserIds()) && !user.bot) {
				if (!(scoapEmbed.getReactionUserIds()[emoji].includes(user_id))) {
					await message_reaction.users.remove(user_id);
					const channel = await user.createDM();
					await channel.send({ content: `sorry, I was offline for maintenance when you submitted your claim for Scoap Squad with title: ${scoapEmbed.getEmbed()[0].title}. Your claim has been revoked, please try to claim again here: <#${channelIds.scoapSquad}>  ` });
				}
			} else if ((!(emoji in scoapEmbed.getReactionUserIds())) && !user.bot) {
				await message_reaction.users.remove(user_id);
				const channel = await user.createDM();
				await channel.send({ content: `sorry, I was offline for maintenance when you submitted your claim for Scoap Squad with title: ${scoapEmbed.getEmbed()[0].title}. Your claim has been revoked, please try to claim again here: <#${channelIds.scoapSquad}>  ` });
			}
			
		}
		collector.collected.set(emoji, message_reaction);
	}
	
	collectReactions(scoapEmbed, voteRecord, validEmojiArray, collector);
};

export const restoreScoapEmbedAndVoteRecord = async () => {
	const db: Db = await dbInstance.dbConnect('degen');
	const dbScoap = db.collection('scoapSquad').find({});
	const dataArray = await dbScoap.toArray();
	if (dataArray.length > 0) {
		for (const entry of dataArray) {
			const sE = entry.scoapEmbed;
			// sE.__proto__ = ScoapEmbed.prototype;
			const vR = entry.voteRecord;
			// vR.__proto__ = VoteRecord.prototype;
			const scoapEmbed = new ScoapEmbed;
			const voteRecord = new VoteRecord;
			Object.getOwnPropertyNames(sE).forEach(function(item) {
				scoapEmbed[item] = sE[item];
			});
			Object.getOwnPropertyNames(vR).forEach(function(item) {
				voteRecord[item] = vR[item];
			});
			const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
			const embedMessage = await scoapChannel.messages.fetch(scoapEmbed.getCurrentMessage());
			scoapEmbed.setCurrentChannel(scoapChannel);
			scoapEmbed.setCurrentMessage(embedMessage);
			// check if poll timed out while offline
			if ((+new Date() - scoapEmbed.getPublishedTimestamp()) <= constants.SCOAP_POLL_TIMEOUT_MS) {
				scoapEmbedState[scoapEmbed.getId()] = scoapEmbed;
				voteRecordState[scoapEmbed.getId()] = voteRecord;
				restoreReactionCollector(scoapEmbed, voteRecord);
				ScoapUtils.logToFile(`Restored two objects (scoapEMbed & voteRecord) from Mongo, id: ${scoapEmbed.getId()}`);
			}
		}
		return true;
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