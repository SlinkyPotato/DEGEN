import { GuildMember, Message, MessageEmbed } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { addPublishReactions } from './create/PublishBounty';
import mongo, { Db } from 'mongodb';
import constants from '../constants/constants';
import { addClaimReactions } from './ClaimBounty';
import { addSubmitReactions } from './SubmitBounty';
import { addCompletedReactions } from './CompleteBounty';
import BountyUtils from '../../utils/BountyUtils';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

/**
 * This service will refresh the bounty in the Bounty board with the correct information
 * @param guildMember
 * @param bountyId
 * @param message
 */
export default async (guildMember: GuildMember, bountyId: string, message: Message): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const bountyCollection: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	if (bountyCollection === null) {
		Log.info(`bounty ${bountyId} is deleted`);
		return message.delete();
	}
	
	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[3].value = bountyCollection.status;
	
	switch (bountyCollection.status) {
	case 'Open':
		embedMessage.setTitle(bountyCollection.title);
		embedMessage.setColor('#1e7e34');
		embedMessage.setDescription(bountyCollection.description);
		embedMessage.setFooter('🏴 - start | 🔄 - refresh | 📝 - edit | ❌ - delete');
		embedMessage.fields[2] = {
			name: 'Reward',
			value: BountyUtils.formatBountyAmount(bountyCollection.reward.amount as number, bountyCollection.reward.scale as number) + ' ' + bountyCollection.reward.currency,
			inline: true,
		};
		embedMessage.fields[1] = {
			name: 'Criteria',
			value: bountyCollection.criteria,
			inline: false,
		};
		await message.edit({ embeds: [embedMessage] });
		addPublishReactions(message);
		break;
	case 'In-Progress':
		embedMessage.setColor('#d39e00');
		embedMessage.setFooter('📮 - submit | 🔄 - refresh | 🆘 - help');
		embedMessage.fields[6] = {
			name: 'Claimed by',
			value: bountyCollection.claimedBy.discordHandle,
			inline: true,
		};
		await message.edit({ embeds: [embedMessage] });
		addClaimReactions(message);
		break;
	case 'In-Review':
		embedMessage.setColor('#d39e00');
		embedMessage.setFooter('✅ - complete | 🔄 - refresh | 🆘 - help');
		embedMessage.fields[7] = {
			name: 'Submitted by',
			value: bountyCollection.submittedBy.discordHandle,
			inline: true,
		};
		await message.edit({ embeds: [embedMessage] });
		addSubmitReactions(message);
		break;
	case 'Completed':
		embedMessage.setColor('#1d2124');
		embedMessage.setFooter('🆘 - help');
		embedMessage.fields[8] = {
			name: 'Reviewed by',
			value: bountyCollection.reviewedBy.discordHandle,
			inline: true,
		};
		await message.edit({ embeds: [embedMessage] });
		await addCompletedReactions(message);
		break;
	case 'Draft':
	case 'Deleted':
	default:
		Log.info(`bounty ${bountyId} is deleted`);
		return message.delete();
	}
	return;
};