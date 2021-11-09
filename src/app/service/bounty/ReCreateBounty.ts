import { GuildMember, Message, MessageOptions, TextChannel } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import mongo, { Db } from 'mongodb';
import constants from '../constants/constants';
import BountyUtils from '../../utils/BountyUtils';
import channelIds from '../constants/channelIds';
import envUrls from '../constants/envUrls';
import ServiceUtils from '../../utils/ServiceUtils';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

/**
 * This service will refresh the bounty in the Bounty board with the correct information
 * @param guildMember
 * @param bountyId
 */
export default async (guildMember: GuildMember, bountyId: string): Promise<Message> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const bountyCollection: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	if (bountyCollection === null) {
		Log.info(`bounty ${bountyId} is deleted`);
		throw new Error('bounty not found');
	}

	const messageOptions: MessageOptions = generateEmbedMessage(bountyCollection, guildMember.user.avatarURL());
	const bountyChannel: TextChannel = await guildMember.guild.channels.fetch(channelIds.bountyBoard) as TextChannel;
	const embedMessage = messageOptions.embeds[0];
	let message: Message;
	
	switch (bountyCollection.status) {
	case 'Open':
		embedMessage.color = '#1e7e34';
		embedMessage.footer = { text: '🏴 - start | 🔄 - refresh | 📝 - edit | ❌ - delete' };
		embedMessage.fields[2].value = BountyUtils.formatBountyAmount(bountyCollection.reward.amount as number, bountyCollection.reward.scale as number) + ' ' + bountyCollection.reward.currency;
		embedMessage.fields[1].value = bountyCollection.criteria;
		message = await bountyChannel.send(messageOptions);
		break;
	case 'In-Progress':
		embedMessage.color = '#d39e00';
		embedMessage.footer = { text: '📮 - submit | 🔄 - refresh | 🆘 - help' };
		message = await bountyChannel.send(messageOptions);
		break;
	case 'In-Review':
		embedMessage.color = '#d39e00';
		embedMessage.footer = { text: '✅ - complete | 🔄 - refresh | 🆘 - help' };
		message = await bountyChannel.send(messageOptions);
		break;
	case 'Completed':
		embedMessage.title = '#1d2124';
		embedMessage.footer = { text: '🆘 - help' };
		message = await bountyChannel.send(messageOptions);
		break;
	case 'Draft':
	case 'Deleted':
	default:
		Log.info(`bounty ${bountyId} is deleted`);
		throw new Error('bounty not valid');
	}
	Log.info('bounty recreated to #bounty-board');
	return message;
};

export const generateEmbedMessage = (bounty: BountyCollection, iconUrl: string): MessageOptions => {
	return {
		embeds: [{
			title: bounty.title,
			url: envUrls.BOUNTY_BOARD_URL + bounty._id,
			author: {
				icon_url: iconUrl,
				name: bounty.createdBy.discordHandle,
			},
			description: bounty.description,
			fields: [
				{ name: 'HashId', value: bounty._id.toHexString() },
				{ name: 'Criteria', value: bounty.criteria },
				{ name: 'Reward', value: bounty.reward.amount + ' ' + bounty.reward.currency.toUpperCase(), inline: true },
				{ name: 'Status', value: bounty.status, inline: true },
				{ name: 'Deadline', value: ServiceUtils.formatDisplayDate(bounty.dueAt), inline: true },
				{ name: 'Created by', value: bounty.createdBy.discordHandle, inline: true },
			],
			timestamp: new Date(),
		}],
	};
};