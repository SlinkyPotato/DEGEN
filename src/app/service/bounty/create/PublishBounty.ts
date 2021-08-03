import constants from '../../../constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../../utils/BountyUtils';
import { GuildMember, Message, MessageOptions, TextChannel } from 'discord.js';
import dbInstance from '../../../utils/db';
import channelIDs from '../../../constants/channelIDs';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return finalizeBounty(guildMember, bountyId);
};

export const finalizeBounty = async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	console.log('starting to finalize bounty: ' + bountyId);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'Draft',
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);

	if (dbBountyResult.status != 'Draft') {
		console.log(`${bountyId} bounty is not drafted`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry bounty is not drafted.`);
	}

	const messageOptions: MessageOptions = {
		embed: {
			color: '#1e7e34',
			title: dbBountyResult.title,
			url: constants.BOUNTY_BOARD_URL + dbBountyResult._id,
			author: {
				icon_url: guildMember.user.avatarURL(),
				name: dbBountyResult.createdBy.discordHandle,
			},
			description: dbBountyResult.summary,
			fields: [
				{ name: 'Reward', value: dbBountyResult.reward.amount + ' ' + dbBountyResult.reward.currency, inline: true },
				{ name: 'Status', value: 'Open', inline: true },
				{ name: 'Deadline', value: dbBountyResult.dueAt, inline: true },
				{ name: 'Criteria', value: dbBountyResult.criteria },
				{ name: 'Summary', value: dbBountyResult.description },
				{ name: 'HashId', value: dbBountyResult._id},
				{ name: 'Created By', value: dbBountyResult.createdBy.discordHandle, inline: true },
			],
			timestamp: new Date(),
			footer: {
				text: '🏴 - start | 📝 - edit | ❌ - delete',
			},
		},
	};

	const bountyChannel: TextChannel = guildMember.guild.channels.cache.get(channelIDs.bountyBoard) as TextChannel;
	const bountyMessage: Message = await bountyChannel.send(messageOptions) as Message;
	await bountyMessage.react('🏴');
	await bountyMessage.react('📝');
	await bountyMessage.react('❌');

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
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
		console.log(`failed to update record ${bountyId} for user <@${guildMember.user.id}>`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry something is not working, our devs are looking into it.`);
	}

	await dbInstance.close();

	return guildMember.send(`<@${guildMember.user.id}> Bounty published to #🧀-bounty-board and the website! ${constants.BOUNTY_BOARD_URL}/${bountyId}`);
};
