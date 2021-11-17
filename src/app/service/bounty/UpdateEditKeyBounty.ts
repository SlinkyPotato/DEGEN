import { GuildMember, Message } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../constants/constants';
import envUrls from '../constants/envUrls';
import { randomUUID } from 'crypto';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string, message?: Message): Promise<any> => {
	const secretEditKey: string = randomUUID();
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	
	const bounty: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	if (bounty === null) {
		Log.info(`bounty ${bountyId} is deleted`);
		return message?.delete();
	}
	
	if (!(bounty.status === 'Draft' || bounty.status === 'Open')) {
		Log.info(`${bountyId} bounty not eligible to be edited`);
		return guildMember.send({ content: `Sorry bounty is not in draft or open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
	}
	
	if (guildMember.user.id !== bounty.createdBy.discordId) {
		Log.info(`${guildMember.user.tag} is attempting to edit a bounty they did not create`);
		return guildMember.send({ content: ` Sorry you are not allowed to edit ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
	} else {
		Log.info(`${guildMember.user.tag} is editing bounty ${bountyId}`);
		return guildMember.send({ content: ` 🚧 This feature is under construction 🚧 \n` +
		` Thank you for your patience as we work to bring you the next and best Bounty Board features.` +
		` In the meantime, please create a new bounty. The current bounty is a draft and will not be visible to other users.`});
	}

	const bountyResult: UpdateWriteOpResult = await dbCollection.updateOne(bounty, {
		$set: {
			editKey: secretEditKey,
		},
	});
	
	if (bountyResult.modifiedCount != 1) {
		Log.info(`bounty ${bountyId} not updated is deleted`);
		return guildMember.send({ content: 'Sorry something is not working, can you try again?' });
	}
	
	return guildMember.send({ content: `Bounty can be edited at ${envUrls.BOUNTY_BOARD_URL}${bountyId}/edit?key=${secretEditKey}` });
};