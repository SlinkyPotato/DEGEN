// import constants from '../service/constants/constants';
import { GuildMember, Message, TextChannel } from 'discord.js';
import { BountyReward } from '../types/bounty/BountyReward';
import channelIDs from '../service/constants/channelIDs';
import ValidationError from '../errors/ValidationError';
import { URL } from 'url';


const ScoapUtils = {


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
		const MAXIMUM_REWARD = 100000000;

		if (isNaN(reward.amount) || reward.amount <= 0 || reward.amount > MAXIMUM_REWARD
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

	// async validateCriteria(guildMember: GuildMember, criteria: string): Promise<any> {
	// 	const CREATE_CRITERIA_REGEX = /^[\w\s.!@#$%&,?']{1,1000}$/;
	// 	if (criteria == null || !CREATE_CRITERIA_REGEX.test(criteria)) {
	// 		await guildMember.send(`<@${guildMember.user.id}>\n` +
	// 			'Please enter a valid criteria: \n' +
	// 			'- 1000 characters maximum\n ' +
	// 			'- alphanumeric\n ' +
	// 			'- special characters: .!@#$%&,?',
	// 		);
	// 		throw new ValidationError('invalid criteria');
	// 	}
	// },

	
	// async getScoapMessage(guildMember: GuildMember, scoapMessageId: string): Promise<Message> {
	// 	const scoapChannel: TextChannel = guildMember.guild.channels.cache.get(channelIDs.scoapSquadAssemble) as TextChannel;
	// 	return await scoapChannel.messages.fetch(scoapMessageId);
	// },
};

export default ScoapUtils;