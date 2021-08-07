import { GuildMember, Message, TextChannel } from 'discord.js';
import { BountyReward } from '../types/bounty/BountyReward';
import channelIDs from '../service/constants/channelIDs';
import ValidationError from '../errors/ValidationError';
import { URL } from 'url';
import envUrls from '../service/constants/envUrls';
import constants from '../service/constants/constants';

/**
 * Utilities file for bounty commands
 */
const BountyUtils = {

	/**
	 * Validate the given string is a bounty id
	 * @param guildMember
	 * @param bountyId
	 */
	async validateBountyId(guildMember: GuildMember, bountyId: string): Promise<any> {
		const BOUNTY_ID_REGEX = /^[a-f\d]{1,24}$/i;
		if ((bountyId == null || !BOUNTY_ID_REGEX.test(bountyId))) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid bounty hash ID: \n' +
				' - can be found on bountyboard website\n' +
				` - ${envUrls.BOUNTY_BOARD_URL}`);
			throw new ValidationError('invalid bountyId');
		}
	},

	/**
	 * Validate the bounty types that are allowed
	 * @param guildMember
	 * @param bountyType
	 */
	async validateBountyType(guildMember: GuildMember, bountyType: string): Promise<any> {
		const ALLOWED_BOUNTY_TYPES = ['OPEN', 'CREATED_BY_ME', 'CLAIMED_BY_ME'];
		if (bountyType == null || !ALLOWED_BOUNTY_TYPES.includes(bountyType)) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid bounty type: \n' +
				' - OPEN\n' +
				' - CREATED_BY_ME' +
				' - CLAIMED_BY_ME',
			);
			throw new ValidationError('invalid bounty type');
		}
	},

	async validateSummary(guildMember: GuildMember, summary: string): Promise<any> {
		const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,4000}$/;
		if (summary == null || !CREATE_SUMMARY_REGEX.test(summary)) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid summary: \n' +
				'- 4000 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid summary');
		}
	},

	async validateReward(guildMember: GuildMember, reward: BountyReward): Promise<void> {
		const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
		const MAXIMUM_REWARD = 100000000.00;

		if (reward.amount === Number.NaN || reward.amount <= 0 || reward.amount > MAXIMUM_REWARD
			|| !ALLOWED_CURRENCIES.includes(reward.currencySymbol)) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid reward value: \n ' +
				'- 100 million maximum currency\n ' +
				'- accepted currencies: ETH, BANK');
			throw new ValidationError('invalid reward');
		}
	},

	async validateTitle(guildMember: GuildMember, title: string): Promise<any> {
		const CREATE_TITLE_REGEX = /^[\w\s.!@#$%&,?']{1,250}$/;
		if (title == null || !CREATE_TITLE_REGEX.test(title)) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid title: \n' +
				'- 250 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid title');
		}
	},

	async validateCriteria(guildMember: GuildMember, criteria: string): Promise<any> {
		const CREATE_CRITERIA_REGEX = /^[\w\s.!@#$%&,?']{1,1000}$/;
		if (criteria == null || !CREATE_CRITERIA_REGEX.test(criteria)) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid criteria: \n' +
				'- 1000 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid criteria');
		}
	},

	async validateUrl(guildMember: GuildMember, url: string): Promise<any> {
		try {
			new URL(url);
		} catch (e) {
			await guildMember.send(`<@${guildMember.user.id}>\n` +
				'Please enter a valid criteria: \n' +
				'- 1000 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?',
			);
			throw new ValidationError('invalid url');
		}
	},
	
	async checkBountyExists(guildMember: GuildMember, dbBountyResult: any | null, bountyId: string): Promise<any> {
		if (dbBountyResult == null) {
			console.log(`${bountyId} bounty not found in db`);
			await guildMember.send(`Sorry <@${guildMember.user.id}>, we're not able to find an open bounty with ID \`${bountyId}\`.`);
			throw new ValidationError('Please try another bounty Id');
		}
		console.log(`found bounty ${bountyId} in db`);
	},
	
	async getBountyMessage(guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<Message> {
		if (message == null) {
			const bountyChannel: TextChannel = guildMember.guild.channels.cache.get(channelIDs.bountyBoard) as TextChannel;
			return bountyChannel.messages.fetch(bountyMessageId);
		} else {
			return message;
		}
	},
	
	getBountyIdFromEmbedMessage(message: Message): string {
		return message.embeds[0].fields[4].value;
	},
};

export default BountyUtils;