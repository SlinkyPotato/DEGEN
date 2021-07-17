import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import db from '../../db/db';
import { MongoError } from 'mongodb';

const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,250}$/;
const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
const MAXIMUM_REWARD = 100000000;

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
					description: '(list|create|claim)',
					required: true,
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'create-summary',
					description: 'What would you like to be worked on?',
				},
				{
					type: CommandOptionType.SUB_COMMAND,
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
	const summary = ctx.options['create-summary'];

	if (summary == null || !CREATE_SUMMARY_REGEX.test(summary)) {
		return ctx.send('' +
			'Please enter a valid create-summary value: \n ' +
			'- 250 characters maximum\n ' +
			'- alphanumeric\n ' +
			'- special characters: .!@#$%&,?');

	}

	const createReward = ctx.options['create-reward'];
	const [reward, rewardSymbol] = (createReward != null) ? createReward.split(' ') : [null, null];
	const rewardNumber = Number(reward);

	if (rewardNumber != Number.NaN || rewardNumber <= 0 || rewardNumber > MAXIMUM_REWARD
		|| !ALLOWED_CURRENCIES.includes(rewardSymbol)) {
		return ctx.send('' +
			'Please enter a valid create-reward value: \n ' +
			'- 100 million maximum currency\n ' +
			'- accepted currencies: ETH, BANK');
	}

	// db.connect(process.env.MONGODB_URI, async (error: MongoError) => {
	// 	if (error) {
	// 		console.log('ERROR', error);
	// 		return;
	// 	}
	//
	//
	//
	// });
	return ctx.send('.');
};