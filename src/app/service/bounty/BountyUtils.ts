import constants from '../../constants';
import { CommandContext } from 'slash-create';
import { GuildMember } from 'discord.js';

const ValidationError = require('../../errors/ValidationError');

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
		const BOUNTY_ID_REGEX = /^[a-f\d]{1,100}$/i;
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
				'Please enter a valid bounty hash ID: \n' +
				' - can be found on bountyboard website\n' +
				` - ${constants.BOUNTY_BOARD_URL}`);
			throw new ValidationError('invalid bounty type');
		}
	},
};

export default BountyUtils;