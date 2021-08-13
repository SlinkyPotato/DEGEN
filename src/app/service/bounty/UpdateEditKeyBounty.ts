import { GuildMember, Message } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import envUrls from '../constants/envUrls';
import { randomUUID } from 'crypto';

export default async (guildMember: GuildMember, bountyId: string, message?: Message): Promise<any> => {
	const secretEditKey: string = randomUUID();
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	
	const bounty: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	if (bounty === null) {
		console.log(`bounty ${bountyId} is deleted`);
		return message?.delete();
	}
	
	if (!(bounty.status === 'Draft' || bounty.status === 'Open')) {
		console.log(`${bountyId} bounty not eligible to be edited`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry bounty is not in draft or open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
	}
	
	if (guildMember.user.id !== bounty.createdBy.discordId) {
		console.log(`${guildMember.user.tag} is attempting to edit a bounty they did not create`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry you are not allowed to edit ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
	}

	const bountyResult: UpdateWriteOpResult = await dbCollection.updateOne(bounty, {
		$set: {
			editKey: secretEditKey,
		},
	});
	
	if (bountyResult.modifiedCount != 1) {
		console.log(`bounty ${bountyId} not updated is deleted`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry something is not working, can you try again?`);
	}
	
	await dbInstance.close();
	return guildMember.send(`<@${guildMember.user.id}> Bounty can be edited at ${envUrls.BOUNTY_BOARD_URL}${bountyId}/edit?key=${secretEditKey}`);
};