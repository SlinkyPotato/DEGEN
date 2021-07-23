import { CommandContext } from 'slash-create';
import db from '../../../utils/db';
import constants from '../../../constants';
import { MongoError } from 'mongodb';
import serviceUtils from '../../../utils/ServiceUtils';

const BOUNTY_BOARD_URL = 'https://bankless.community';
const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const guildMember = await serviceUtils.getGuildMember(ctx);
	const params = ctx.options.create.new;
	const { isSummaryValid, summary } = module.exports.validateSummary(params.summary);

	if (!isSummaryValid) {
		await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		return guildMember.send(`<@${ctx.user.id}>\n` +
			'Please enter a valid create-summary value: \n ' +
			'- 250 characters maximum\n ' +
			'- alphanumeric\n ' +
			'- special characters: .!@#$%&,?');
	}

	const { isRewardValid, rewardNumber, rewardSymbol } = module.exports.validateReward(params.reward);
	if (!isRewardValid) {
		await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		return guildMember.send(`<@${ctx.user.id}>\n` +
			'Please enter a valid create-reward value: \n ' +
			'- 100 million maximum currency\n ' +
			'- accepted currencies: ETH, BANK');
	}

	await db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError) => {
		if (error) {
			console.log('ERROR', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}
		const dbBounty = db.get().collection(constants.DB_COLLECTION_BOUNTIES);
		const newBounty = module.exports.generateBountyRecord(summary, rewardNumber, rewardSymbol, ctx.user.username, ctx.user.id);

		const dbInsertResult = await dbBounty.insertOne(newBounty);
		if (dbInsertResult == null) {
			console.error('failed to insert bounty into DB', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}
		await db.close();
		console.log(`user ${ctx.user.username} inserted into db`);
		await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		return guildMember.send(`<@${ctx.user.id}> Bounty drafted! Please finalize the bounty at ${BOUNTY_BOARD_URL}/${dbInsertResult.insertedId}`);
	});
};

module.exports.validateSummary = (summary: string): {isSummaryValid: boolean, summary: string} => {
	const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,250}$/;
	return {
		isSummaryValid: !(summary == null || !CREATE_SUMMARY_REGEX.test(summary)),
		summary: summary,
	};
};

module.exports.validateReward = (createReward: string): {isRewardValid: boolean, rewardNumber: number, rewardSymbol: string} => {
	const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
	const MAXIMUM_REWARD = 100000000;

	const [reward, symbol] = (createReward != null) ? createReward.split(' ') : [null, null];
	const rewardNumber = Number(reward);

	return {
		isRewardValid: !(rewardNumber === Number.NaN || rewardNumber <= 0 || rewardNumber > MAXIMUM_REWARD || !ALLOWED_CURRENCIES.includes(symbol)),
		rewardNumber: rewardNumber,
		rewardSymbol: symbol,
	};
};

module.exports.generateBountyRecord = (summary: string, rewardAmount: number, currencySymbol: string, discordHandle: string,
	discordId: string) => {
	const currentDate = (new Date()).toISOString();
	return {
		season: process.env.DAO_CURRENT_SEASON,
		description: summary,
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