import BountyUtils from '../../utils/BountyUtils';
import { GuildMember, Message, MessageEmbed } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { addPublishReactions } from './create/PublishBounty';
import mongo, { Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { addClaimReactions } from './ClaimBounty';
import { addSubmitReactions } from './SubmitBounty';
import { addCompletedReactions } from './CompleteBounty';

/**
 * This service will refresh the bounty in the Bounty board with the correct information
 * @param guildMember
 * @param bountyId
 */
export default async (guildMember: GuildMember, bountyId: string, message: Message): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const bountyCollection: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	if (bountyCollection === null) {
		console.log(`bounty ${bountyId} is deleted`);
		return message.delete();
	}
	
	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[1].value = bountyCollection.status;
	
	switch (bountyCollection.status) {
	case 'Open':
		embedMessage.setColor('#1e7e34');
		embedMessage.setFooter('🏴 - start | 🔄 - refresh | 📝 - edit | ❌ - delete');
		await message.edit(embedMessage);
		addPublishReactions(message);
		break;
	case 'In-Progress':
		embedMessage.setColor('#d39e00');
		embedMessage.setFooter('📮 - submit | 🔄 - refresh | 🆘 - help');
		await message.edit(embedMessage);
		addClaimReactions(message);
		break;
	case 'In-Review':
		embedMessage.setColor('#d39e00');
		embedMessage.setFooter('✅ - complete | 🔄 - refresh | 🆘 - help');
		await message.edit(embedMessage);
		addSubmitReactions(message);
		break;
	case 'Completed':
		embedMessage.setColor('#1d2124');
		embedMessage.setFooter('🆘 - help');
		await message.edit(embedMessage);
		addCompletedReactions(message);
		break;
	case 'Draft':
	case 'Deleted':
	default:
		console.log(`bounty ${bountyId} is deleted`);
		return message.delete();
	}
	
};