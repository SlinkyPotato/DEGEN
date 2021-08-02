import { CommandContext } from 'slash-create';
import constants from '../../../constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../../utils/BountyUtils';
import { GuildMember, Message, MessageOptions, TextChannel } from 'discord.js';
import dbInstance from '../../../utils/db';
import channelIDs from '../../../constants/channelIDs';

const BOUNTY_BOARD_URL = 'https://bankless.community/';

export default async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {
	if (ctx.user.bot) return;

	const bountyId = ctx.options.create.validate['bounty-id'];
	await BountyUtils.validateBountyId(ctx, guildMember, bountyId);
	return finalizeBounty(ctx, guildMember, bountyId);
};

export const finalizeBounty = async (ctx: CommandContext, guildMember: GuildMember, bountyId: string): Promise<any> => {
	console.log('starting to finalize bounty: ' + bountyId);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'Draft',
	});

	if (dbBountyResult == null) {
		console.log(`${bountyId} bounty not found in db`);
		await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		return guildMember.send(`<@${ctx.user.id}> Sorry we're not able to find the drafted bounty.`);
	}

	if (dbBountyResult.status != 'Draft') {
		console.log(`${bountyId} bounty is not drafted`);
		return ctx.send(`<@${ctx.user.id}> Sorry bounty is not drafted.`);
	}

	const messageOptions: MessageOptions = {
		embed: {
			title: dbBountyResult.title,
			url: BOUNTY_BOARD_URL + dbBountyResult._id,
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
				{ name: 'CreatedBy', value: dbBountyResult.createdBy.discordHandle },
				{ name: 'HashId', value: dbBountyResult._id },
			],
			timestamp: new Date(),
			footer: {
				text: '🏴 - claim | 📝 - edit | ❌ - delete',
			},
		},
	};

	const bountyChannel: TextChannel = await guildMember.guild.channels.cache.get(channelIDs.bountyBoard) as TextChannel;
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
		console.log(`failed to update record ${bountyId} for user <@${ctx.user.id}>`);
		return ctx.send(`<@${ctx.user.id}> Sorry something is not working, our devs are looking into it.`);
	}

	await dbInstance.close();

	return guildMember.send(`<@${ctx.user.id}> Bounty published to #🧀-bounty-board and the website! ${constants.BOUNTY_BOARD_URL}/${bountyId}`);
};
