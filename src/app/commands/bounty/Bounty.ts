import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import db from '../../db/db';
import { MongoClient, MongoError } from 'mongodb';
import constants from '../../constants';

const BOUNTY_BOARD_URL = 'https://bankless.community';

module.exports = class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, and claim bounties',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'operation',
					description: 'Easily view, create, and claim bounties from the bounty board',
					required: true,
					choices: [{
						name: 'list',
						value: 'list',
					}, {
						name: 'create',
						value: 'create',
					}, {
						name: 'claim',
						value: 'claim',
					}],
				},
				{
					type: CommandOptionType.STRING,
					name: 'create-summary',
					description: 'What would you like to be worked on?',
				},
				{
					type: CommandOptionType.STRING,
					name: 'create-reward',
					description: 'What is the reward? (i.e 100 BANK)',
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
		});
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;

		switch (ctx.options.operation) {
		case 'list':
			return ctx.send('there are zero bounties...');
		case 'create':
			return module.exports.handleCreateBounty(ctx);
		case 'claim':
			return ctx.send('bounty claimed for id: ');
		default:
			return ctx.send('no bounty for you! go away');
		}
	}
};

module.exports.handleCreateBounty = async (ctx: CommandContext) => {
	if (ctx.user.bot) return;

	const { isSummaryValid, summary } = module.exports.validateSummary(ctx.options['create-summary']);
	if (!isSummaryValid) {
		return ctx.send('' +
			'Please enter a valid create-summary value: \n ' +
			'- 250 characters maximum\n ' +
			'- alphanumeric\n ' +
			'- special characters: .!@#$%&,?');

	}

	const { isRewardValid, rewardNumber, rewardSymbol } = module.exports.validateReward(ctx.options['create-reward']);
	if (!isRewardValid) {
		return ctx.send('' +
			'Please enter a valid create-reward value: \n ' +
			'- 100 million maximum currency\n ' +
			'- accepted currencies: ETH, BANK');
	}

	db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError) => {
		if (error) {
			console.log('ERROR', error);
			return;
		}
		const dbBounty = db.get().collection(constants.DB_COLLECTION_BOUNTY_BOARD);
		const newBounty = module.exports.generateBountyRecord(summary, rewardNumber, rewardSymbol, ctx.user.username);
		console.log(newBounty);
		const dbInsertResult = await dbBounty.insertOne(newBounty);
		if (dbInsertResult == null) {
			console.error('failed to insert bounty into DB');
			return;
		}
		await db.close();
		console.log(`user ${ctx.user.username} inserted into db`);
		return ctx.send(`Bounty is now drafted! Check out the bounty at: ${BOUNTY_BOARD_URL}/${dbInsertResult.insertedId}`);
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

module.exports.generateBountyRecord = (
	summary: string, rewardAmount: number, currencySymbol: string, discordHandle: string
) => {
	const currentTimestamp = Date.now();
	return {
		season: process.env.DAO_CURRENT_SEASON,
		description: summary,
		reward: {
			currency: currencySymbol,
			amount: rewardAmount,
		},
		createdBy: {
			discordHandle: discordHandle,
		},
		createdAt: currentTimestamp,
		statusHistory: [
			{
				status: 'Draft',
				setAt: currentTimestamp,
			},
		],
		idDiscordBotGenerated: true,
	};
};