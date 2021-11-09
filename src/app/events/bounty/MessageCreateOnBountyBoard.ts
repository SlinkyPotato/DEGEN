import { GuildMember, Message } from 'discord.js';
import constants from '../../service/constants/constants';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import envUrls from '../../service/constants/envUrls';
import { addPublishReactions } from '../../service/bounty/create/PublishBounty';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (message: Message): Promise<any> => {
	if (message.author.username !== constants.BOUNTY_BOARD_WEBSITE_WEBHOOK_NAME) return;
	
	// Add reactions to newly created message
	addPublishReactions(message);

	const bountyId: string = BountyUtils.getBountyIdFromEmbedMessage(message);
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	const guildMember: GuildMember = await message.guild.members.fetch(dbBountyResult.createdBy.discordId);

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			discordMessageId: message.id,
		},
	});

	if (writeResult.modifiedCount != 1) {
		Log.error(`failed to update record ${bountyId} for user <@${guildMember.user.id}>`);
		return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
	}

	return guildMember.send({ content: `Bounty published to #🧀-bounty-board and the website! ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
};