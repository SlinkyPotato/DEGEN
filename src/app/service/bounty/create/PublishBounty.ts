import constants from '../../constants/constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../../utils/BountyUtils';
import { GuildMember, Message, MessageEmbedOptions, TextChannel } from 'discord.js';
import ServiceUtils from '../../../utils/ServiceUtils';
import envUrls from '../../constants/envUrls';
import { BountyCollection } from '../../../types/bounty/BountyCollection';
import { CustomerCollection } from '../../../types/bounty/CustomerCollection';
import Log from '../../../utils/Log';
import MongoDbUtils from '../../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string, guildID: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return finalizeBounty(guildMember, bountyId, guildID);
};

export const finalizeBounty = async (guildMember: GuildMember, bountyId: string, guildID: string): Promise<any> => {
	Log.info('starting to finalize bounty: ' + bountyId);

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollectionBounties = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbCollectionCustomers = db.collection(constants.DB_COLLECTION_CUSTOMERS);
	const dbBountyResult: BountyCollection = await dbCollectionBounties.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'Draft',
	});
	const dbCustomerResult: CustomerCollection = await dbCollectionCustomers.findOne({
		customerId: guildID
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);

	if (dbBountyResult.status != 'Draft') {
		Log.info(`${bountyId} bounty is not drafted`);
		return guildMember.send({ content: 'Sorry bounty is not drafted.' });
	}
	const messageOptions: MessageEmbedOptions = generateEmbedMessage(dbBountyResult, 'Open');

	const bountyChannel: TextChannel = await guildMember.guild.channels.fetch(dbCustomerResult.bountyChannel) as TextChannel;
	const bountyMessage: Message = await bountyChannel.send({ embeds: [messageOptions] });
	Log.info('bounty published to #bounty-board');
	addPublishReactions(bountyMessage);

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollectionBounties.updateOne(dbBountyResult, {
		$set: {
			status: 'Open',
			discordMessageId: bountyMessage.id,
		},
		$push: {
			statusHistory: {
				status: 'Open',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		Log.info(`failed to update record ${bountyId} for user <@${guildMember.user.id}>`);
		return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
	}

	return guildMember.send({ content: `Bounty published to #🧀-bounty-board and the website! ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
};

export const addPublishReactions = (message: Message): void => {
	message.reactions.removeAll();
	message.react('🏴');
	message.react('🔄');
	message.react('📝');
	message.react('❌');
};

export const generateEmbedMessage = (dbBounty: BountyCollection, newStatus: string): MessageEmbedOptions => {
	return {
		color: 1998388,
		title: dbBounty.title,
		url: (envUrls.BOUNTY_BOARD_URL + dbBounty._id.toHexString()),
		author: {
			iconURL: dbBounty.createdBy.iconUrl,
			name: dbBounty.createdBy.discordHandle,
		},
		description: dbBounty.description,
		fields: [
			{ name: 'HashId', value: dbBounty._id.toHexString(), inline: false },
			{ name: 'Criteria', value: dbBounty.criteria, inline: false },
			{ name: 'Reward', value: dbBounty.reward.amount + ' ' + dbBounty.reward.currency.toUpperCase(), inline: true },
			{ name: 'Status', value: newStatus, inline: true },
			{ name: 'Deadline', value: ServiceUtils.formatDisplayDate(dbBounty.dueAt), inline: true },
			{ name: 'Created by', value: dbBounty.createdBy.discordHandle, inline: true },
		],
		timestamp: new Date().getTime(),
		footer: {
			text: '🏴 - claim | 🔄 - refresh | 📝 - edit | ❌ - delete',
		},
	};
};
