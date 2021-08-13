import {GuildMember, Message, MessageOptions, TextChannel} from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import mongo, { Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import BountyUtils from '../../utils/BountyUtils';
import channelIDs from '../constants/channelIDs';
import envUrls from '../constants/envUrls';
import ServiceUtils from '../../utils/ServiceUtils';

/**
 * This service will refresh the bounty in the Bounty board with the correct information
 * @param guildMember
 * @param bountyId
 */
export default async (guildMember: GuildMember, bountyId: string): Promise<Message> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const bountyCollection: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	if (bountyCollection === null) {
		console.log(`bounty ${bountyId} is deleted`);
		throw new Error('bounty not found');
	}

	const messageOptions: MessageOptions = generateEmbedMessage(bountyCollection, guildMember.user.avatarURL());
	const bountyChannel: TextChannel = guildMember.guild.channels.cache.get(channelIDs.bountyBoard) as TextChannel;
	const embedMessage = messageOptions.embed;
	let message: Message;
	
	switch (bountyCollection.status) {
	case 'Open':
		embedMessage.color = '#1e7e34';
		embedMessage.footer = { text: '🏴 - start | 🔄 - refresh | 📝 - edit | ❌ - delete' };
		embedMessage.fields[0].value = BountyUtils.formatBountyAmount(bountyCollection.reward.amount as number, bountyCollection.reward.scale as number) + ' ' + bountyCollection.reward.currency;
		embedMessage.fields[3].value = bountyCollection.criteria;
		message = await bountyChannel.send(messageOptions) as Message;
		break;
	case 'In-Progress':
		embedMessage.color = '#d39e00';
		embedMessage.footer = { text: '📮 - submit | 🔄 - refresh | 🆘 - help' };
		message = await bountyChannel.send(messageOptions) as Message;
		break;
	case 'In-Review':
		embedMessage.color = '#d39e00';
		embedMessage.footer = { text: '✅ - complete | 🔄 - refresh | 🆘 - help' };
		message = await bountyChannel.send(messageOptions) as Message;
		break;
	case 'Completed':
		embedMessage.title = '#1d2124';
		embedMessage.footer = { text: '🆘 - help' };
		message = await bountyChannel.send(messageOptions) as Message;
		break;
	case 'Draft':
	case 'Deleted':
	default:
		console.log(`bounty ${bountyId} is deleted`);
		throw new Error('bounty not valid');
	}
	await dbInstance.close();
	console.log('bounty recreated to #bounty-board');
	return message;
};

export const generateEmbedMessage = (bounty: BountyCollection, iconUrl: string): MessageOptions => {
	return {
		embed: {
			title: bounty.title,
			url: envUrls.BOUNTY_BOARD_URL + bounty._id,
			author: {
				icon_url: iconUrl,
				name: bounty.createdBy.discordHandle,
			},
			description: bounty.description,
			fields: [
				{ name: 'Reward', value: bounty.reward.amount + ' ' + bounty.reward.currency.toUpperCase(), inline: true },
				{ name: 'Status', value: bounty.status, inline: true },
				{ name: 'Deadline', value: ServiceUtils.formatDisplayDate(bounty.dueAt), inline: true },
				{ name: 'Criteria', value: bounty.criteria },
				{ name: 'HashId', value: bounty._id },
				{ name: 'Created By', value: bounty.createdBy.discordHandle, inline: true },
			],
			timestamp: new Date(),
		},
	};
};