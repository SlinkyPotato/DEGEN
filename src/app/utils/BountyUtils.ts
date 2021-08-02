import constants from '../constants';
import { CommandContext } from 'slash-create';
import { GuildMember } from 'discord.js';

const ValidationError = require('../errors/ValidationError');

/**
 * Utilities file for bounty commands
 */
const BountyUtils = {

	/**
	 * Validate the given string is a bounty id
	 * @param ctx
	 * @param guildMember
	 * @param bountyId
	 */
	async validateBountyId(ctx: CommandContext, guildMember: GuildMember, bountyId: string): Promise<any> {
		const BOUNTY_ID_REGEX = /^[a-f\d]{1,24}$/i;
		if ((bountyId == null || !BOUNTY_ID_REGEX.test(bountyId))) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid bounty hash ID: \n' +
				' - can be found on bountyboard website\n' +
				` - ${constants.BOUNTY_BOARD_URL}`);
			throw new ValidationError('invalid bountyId');
		}
	},

	/**
	 * Validate the bounty types that are allowed
	 * @param ctx
	 * @param guildMember
	 * @param bountyType
	 */
	async validateBountyType(ctx: CommandContext, guildMember: GuildMember, bountyType: string): Promise<any> {
		const ALLOWED_BOUNTY_TYPES = ['OPEN', 'CREATED_BY_ME', 'CLAIMED_BY_ME'];
		if (bountyType == null || !ALLOWED_BOUNTY_TYPES.includes(bountyType)) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid bounty type: \n' +
				' - OPEN\n' +
				' - CREATED_BY_ME' +
				' - CLAIMED_BY_ME',
			);
			throw new ValidationError('invalid bounty type');
		}
	},

	async validateSummary(ctx: CommandContext, guildMember: GuildMember, summary: string): Promise<any> {
		const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,4000}$/;
		if (summary == null || !CREATE_SUMMARY_REGEX.test(summary)) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid summary: \n' +
				'- 4000 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid summary');
		}
	},

	async validateReward(ctx: CommandContext, guildMember: GuildMember, rewardWithCurrency: string)
		: Promise<{ rewardNumber: number, rewardSymbol: string }> {
		const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
		const MAXIMUM_REWARD = 100000000;

		const [reward, symbol] = (rewardWithCurrency != null) ? rewardWithCurrency.split(' ') : [null, null];
		const rewardNumber = Number(reward);

		if (rewardNumber === Number.NaN || rewardNumber <= 0 || rewardNumber > MAXIMUM_REWARD || !ALLOWED_CURRENCIES.includes(symbol)) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid reward value: \n ' +
				'- 100 million maximum currency\n ' +
				'- accepted currencies: ETH, BANK');
			throw new ValidationError('invalid reward');
		}

		return {
			rewardNumber: rewardNumber,
			rewardSymbol: symbol,
		};
	},

	async validateTitle(ctx: CommandContext, guildMember: GuildMember, title: string): Promise<any> {
		const CREATE_TITLE_REGEX = /^[\w\s.!@#$%&,?']{1,250}$/;
		if (title == null || !CREATE_TITLE_REGEX.test(title)) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid title: \n' +
				'- 250 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid title');
		}
	},

	async validateCriteria(ctx: CommandContext, guildMember: GuildMember, criteria: string): Promise<any> {
		const CREATE_CRITERIA_REGEX = /^[\w\s.!@#$%&,?']{1,1000}$/;
		if (criteria == null || !CREATE_CRITERIA_REGEX.test(criteria)) {
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			await guildMember.send(`<@${ctx.user.id}>\n` +
				'Please enter a valid criteria: \n' +
				'- 1000 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid criteria');
		}
	},
};

export default BountyUtils;