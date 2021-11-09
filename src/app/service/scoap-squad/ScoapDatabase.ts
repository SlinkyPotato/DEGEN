import { Db } from 'mongodb';
import cloneDeep from 'lodash.clonedeep';
import { ScoapEmbed, VoteRecord } from './ScoapClasses';
import client from '../../app';
import { Message, TextChannel } from 'discord.js';
import channelIds from '../constants/channelIds';
import ScoapUtils from '../../utils/ScoapUtils';
import constants from '../constants/constants';
import scoapSquadNotion from '../constants/scoapSquadNotion';
import { createReactionCollector, collectReactions } from './ScoapPoll';
import { updateStatusSelectField } from './ScoapNotion';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';


// ScoapSquad state initialization
export const scoapEmbedState = {};
export const botConvoState = {};
export const voteRecordState = {};
ScoapUtils.logToFile(`state objects initiated. \n scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n botConvoState: ${JSON.stringify(botConvoState)}  \n voteRecordState: ${JSON.stringify(voteRecordState)}`);
setInterval(function() { ScoapUtils.purgeExpiredBotConvo(botConvoState, scoapEmbedState); }, 60000);


const decircularizeScoapEmbed = (scoapEmbed) => {
	const clone = cloneDeep(scoapEmbed);
	// here currentMessage:Message and currentChannel:TextBasedChannels are replaced their ID's
	clone.setCurrentMessage(scoapEmbed.getCurrentMessage().id);
	clone.setCurrentChannel(scoapEmbed.getCurrentChannel().id);
	return clone;
};

export const updateScoapEmbedAndVoteRecordDb = async (scoapEmbed: ScoapEmbed, voteRecord: VoteRecord): Promise<void> => {
	const clone = decircularizeScoapEmbed(scoapEmbed);
	const filter = { id: scoapEmbed.getId() };
	const options = { upsert: true };
	const updateDoc = { $set: { scoapEmbed: clone, voteRecord: voteRecord } };
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const dbScoap = db.collection(constants.DB_COLLECTION_SCOAP_SQUAD);
	await dbScoap.updateOne(filter, updateDoc, options);
	ScoapUtils.logToFile(`Mongo updated, id: ${scoapEmbed.getId()}`);
};

const restoreReactionCollector = async (scoapEmbed: ScoapEmbed, voteRecord: VoteRecord): Promise<void> => {
	const validEmojiArray = cloneDeep(scoapEmbed.getVotableEmojiArray());
	validEmojiArray.push(constants.EMOJIS.cross_mark);
	const timeout = constants.SCOAP_POLL_TIMEOUT_MS - (+new Date() - scoapEmbed.getPublishedTimestamp());
	const collector = createReactionCollector(scoapEmbed.getCurrentMessage() as Message, validEmojiArray, timeout);
	const embedMessage: Message = scoapEmbed.getCurrentMessage() as Message;
	for (const [emoji, messageReaction] of embedMessage.reactions.cache) {
		for (const [userId, user] of await messageReaction.users.fetch()) {
			if ((emoji in scoapEmbed.getReactionUserIds()) && !user.bot) {
				if (!(scoapEmbed.getReactionUserIds()[emoji].includes(userId))) {
					await messageReaction.users.remove(userId);
					const channel = await user.createDM();
					await channel.send({ content: `sorry, I was offline for maintenance when you submitted your claim for Scoap Squad with title: ${scoapEmbed.getEmbed()[0].title}. Your claim has been revoked, please try to claim again here: <#${channelIds.scoapSquad}>  ` });
				}
			} else if ((!(emoji in scoapEmbed.getReactionUserIds())) && !user.bot) {
				await messageReaction.users.remove(userId);
				const channel = await user.createDM();
				await channel.send({ content: `sorry, I was offline for maintenance when you submitted your claim for Scoap Squad with title: ${scoapEmbed.getEmbed()[0].title}. Your claim has been revoked, please try to claim again here: <#${channelIds.scoapSquad}>  ` });
			}
			
		}
		collector.collected.set(emoji, messageReaction);
	}
	
	await collectReactions(scoapEmbed, voteRecord, validEmojiArray, collector);
};

export const restoreScoapEmbedAndVoteRecord = async (): Promise<boolean> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbScoap = db.collection(constants.DB_COLLECTION_SCOAP_SQUAD).find({});
	const dataArray = await dbScoap.toArray();
	if (dataArray.length > 0) {
		for (const entry of dataArray) {
			const sE = entry.scoapEmbed;
			const vR = entry.voteRecord;
			const scoapEmbed = new ScoapEmbed;
			const voteRecord = new VoteRecord;
			Object.getOwnPropertyNames(sE).forEach(function(item) {
				scoapEmbed[item] = sE[item];
			});
			Object.getOwnPropertyNames(vR).forEach(function(item) {
				voteRecord[item] = vR[item];
			});
			const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
			// scoapEmbed.getCurrentMessage() is only a message id string before this step, as it came from db storage, not a Message object
			const embedMessage: Message = await scoapChannel.messages.fetch(scoapEmbed.getCurrentMessage() as string) as Message;
			scoapEmbed.setCurrentChannel(scoapChannel);
			// now it is a Message object again
			scoapEmbed.setCurrentMessage(embedMessage);
			// check if poll timed out while offline
			if ((+new Date() - scoapEmbed.getPublishedTimestamp()) <= constants.SCOAP_POLL_TIMEOUT_MS) {
				scoapEmbedState[scoapEmbed.getId()] = scoapEmbed;
				voteRecordState[scoapEmbed.getId()] = voteRecord;
				await restoreReactionCollector(scoapEmbed, voteRecord);
				ScoapUtils.logToFile(`Restored two objects (scoapEMbed & voteRecord) from Mongo, id: ${scoapEmbed.getId()}`);
			} else {
				Log.debug('removing timed out objects from database');
				await deleteScoapEmbedAndVoteRecord(scoapEmbed.getId());
				Log.debug('removed ' + scoapEmbed.getId() + 'and updating notion');
				await updateStatusSelectField(scoapEmbed.getNotionPageId(), scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.categories.cancelled);
			}
		}
		return true;
	} else {
		Log.debug('No uncompleted poll data in mongodb to restore');
		return false;
	}
};

export const deleteScoapEmbedAndVoteRecord = async (scoapEmbedId: string): Promise<void> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	await db.collection('scoapSquad').deleteMany({ id: scoapEmbedId });
	ScoapUtils.logToFile(`Document removed from Mongo, id: , ${scoapEmbedId}`);
};