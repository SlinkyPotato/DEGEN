import { CommandContext, User } from 'slash-create';
import constants from '../../constants/constants';
import BountyUtils from '../../../utils/BountyUtils';
import { GuildMember, Message, MessageOptions, MessageReaction } from 'discord.js';
import { finalizeBounty } from './PublishBounty';
import { Db, Int32 } from 'mongodb';
import dbInstance from '../../../utils/db';
import { deleteBountyForValidId } from '../DeleteBounty';
import { BountyCreateNew } from '../../../types/bounty/BountyCreateNew';
import ServiceUtils from '../../../utils/ServiceUtils';
import envUrls from '../../constants/envUrls';
import UpdateEditKeyBounty from '../UpdateEditKeyBounty';

const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

export default async (guildMember: GuildMember, params: BountyCreateNew, ctx?: CommandContext): Promise<any> => {
	const title = params.title;
	const summary = params.summary;
	const criteria = params.criteria;
	const reward = params.reward;
	
	await BountyUtils.validateReward(guildMember, reward);
	await BountyUtils.validateSummary(guildMember, summary);
	await BountyUtils.validateTitle(guildMember, title);
	await BountyUtils.validateCriteria(guildMember, criteria);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbBounty = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const newBounty = generateBountyRecord(
		params, guildMember.user.tag, guildMember.user.id,
	);

	const dbInsertResult = await dbBounty.insertOne(newBounty);

	if (dbInsertResult == null) {
		console.error('failed to insert bounty into DB');
		return guildMember.send('Sorry something is not working, our devs are looking into it.');
	}
	await dbInstance.close();

	console.log(`user ${guildMember.user.tag} inserted into db`);

	const messageOptions: MessageOptions = {
		embed: {
			title: newBounty.title,
			url: (envUrls.BOUNTY_BOARD_URL + dbInsertResult.insertedId),
			author: {
				icon_url: guildMember.user.avatarURL(),
				name: newBounty.createdBy.discordHandle,
			},
			description: newBounty.description,
			fields: [
				{ name: 'Reward', value: BountyUtils.formatBountyAmount(newBounty.reward.amount, newBounty.reward.scale) + ' ' + newBounty.reward.currency.toUpperCase(), inline: true },
				{ name: 'Status', value: 'Open', inline: true },
				{ name: 'Deadline', value: ServiceUtils.formatDisplayDate(newBounty.dueAt), inline: true },
				{ name: 'Criteria', value: newBounty.criteria },
				{ name: 'HashId', value: dbInsertResult.insertedId },
				{ name: 'CreatedBy', value: newBounty.createdBy.discordHandle, inline: true },
			],
			timestamp: new Date(),
			footer: {
				text: '👍 - publish | 📝 - edit | ❌ - delete | Please reply within 60 minutes',
			},
		},
	};
	ctx?.send(`${ctx.user.mention} Sent you draft of the bounty! Please finalize bounty in DM`);
	const message: Message = await guildMember.send(messageOptions) as Message;
	
	await message.react('👍');
	await message.react('📝');
	await message.react('❌');

	return handleBountyReaction(message, guildMember, dbInsertResult.insertedId);
};

export const generateBountyRecord = (bountyParams: BountyCreateNew, discordHandle: string, discordId: string): any => {
	const currentDate = (new Date()).toISOString();
	const precision = (bountyParams.reward.amount);
	console.log(precision);
	return {
		season: new Int32(Number(process.env.DAO_CURRENT_SEASON)),
		title: bountyParams.title,
		description: bountyParams.summary,
		criteria: bountyParams.criteria,
		reward: {
			currency: bountyParams.reward.currencySymbol,
			amount: new Int32(bountyParams.reward.amount),
			scale: new Int32(bountyParams.reward.scale),
		},
		createdBy: {
			discordHandle: discordHandle,
			discordId: discordId,
		},
		createdAt: currentDate,
		statusHistory: [
			{
				status: 'Draft',
				setAt: currentDate,
			},
		],
		status: 'Draft',
		dueAt: END_OF_SEASON,
	};
};

const handleBountyReaction = (message: Message, guildMember: GuildMember, bountyId: string): Promise<any> => {
	return message.awaitReactions((reaction, user: User) => {
		return ['📝', '👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (60000 * 60),
		errors: ['time'],
	}).then(collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			console.log('/bounty create new | :thumbsup: up given');
			return finalizeBounty(guildMember, bountyId);
		} else if (reaction.emoji.name === '📝') {
			console.log('/bounty create new | :pencil: given');
			return UpdateEditKeyBounty(guildMember, bountyId);
		} else {
			console.log('/bounty create new | delete given');
			return deleteBountyForValidId(guildMember, bountyId);
		}
	}).catch(console.error);
};