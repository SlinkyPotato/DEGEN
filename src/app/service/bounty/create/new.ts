import { CommandContext } from 'slash-create';
import db from '../../../utils/db';
import constants from '../../../constants';
import { MongoError } from 'mongodb';
import ServiceUtils from '../../../utils/ServiceUtils';
import BountyUtils from '../../../utils/BountyUtils';

const BOUNTY_BOARD_URL = 'https://bankless.community';
const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

	const title = ctx.options.create.new.title;
	const summary = ctx.options.create.new.summary;
	const criteria = ctx.options.create.new.criteria;
	const reward = ctx.options.create.new.reward;
	const { rewardNumber, rewardSymbol } = await BountyUtils.validateReward(ctx, guildMember, reward);

	await BountyUtils.validateSummary(ctx, guildMember, summary);
	await BountyUtils.validateTitle(ctx, guildMember, title);
	await BountyUtils.validateCriteria(ctx, guildMember, criteria);

	await db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError) => {
		if (error) {
			console.log('ERROR', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}
		const dbBounty = db.get().collection(constants.DB_COLLECTION_BOUNTIES);
		const newBounty = generateBountyRecord(
			summary, rewardNumber, rewardSymbol, ctx.user.username, ctx.user.id,
			title, criteria,
		);

		const dbInsertResult = await dbBounty.insertOne(newBounty);
		if (dbInsertResult == null) {
			console.error('failed to insert bounty into DB', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}
		await db.close();
		console.log(`user ${ctx.user.username} inserted into db`);
		await ctx.send(`${ctx.user.mention} Bounty drafted! Please check your DM for next step.`);
		return guildMember.send(`<@${ctx.user.id}> Please finalize the bounty by reacting with an emoji:\n\n
		 :thumbsup: - bounty is ready to be posted on the channel\n
		 :pencil: - let's make some additional changes to the bounty\n
		 bounty page url: ${BOUNTY_BOARD_URL}/${dbInsertResult.insertedId}`);
	});
};

export const generateBountyRecord = (
	summary: string, rewardAmount: number, currencySymbol: string, discordHandle: string,
	discordId: string, title: string, criteria: string,
): any => {
	const currentDate = (new Date()).toISOString();
	return {
		season: process.env.DAO_CURRENT_SEASON,
		title: title,
		description: summary,
		criteria: criteria,
		reward: {
			currency: currencySymbol,
			amount: rewardAmount,
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
		dueDate: END_OF_SEASON,
		isDiscordBotGenerated: true,
	};
};