// import constants from '../service/constants/constants';
import { GuildMember, Message, TextChannel, TextBasedChannels} from 'discord.js';
// import channelIDs from '../service/constants/channelIDs';
import ValidationError from '../errors/ValidationError';
// import { URL } from 'url';


const ScoapUtils = {

	retrieveObjectFromArray(array: Array<any>, channel: TextBasedChannels): any {
		return array.map(x => x.current_channel).indexOf(channel);
	},

	async clearArray(array: Array<any>, message: Message): Promise<any> {
		const removeIndex = array.map(item => item.getCurrentChannel()).indexOf(message.channel);
		~removeIndex && array.splice(removeIndex, 1);
	},

	async validateSummary(summary: string): Promise<any> {
		const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,4000}$/;
		if (summary == null || !CREATE_SUMMARY_REGEX.test(summary)) {
			// await guildMember.send(`<@${guildMember.user.id}>\n` +
			// 	'Please enter a valid summary: \n' +
			// 	'- 4000 characters maximum\n ' +
			// 	'- alphanumeric\n ' +
			// 	'- special characters: .!@#$%&,?',
			// );
			throw new ValidationError('invalid summary');
		}
	},

	// async validateReward(guildMember: GuildMember, reward: BountyReward): Promise<void> {
	// 	const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
	// 	const MAXIMUM_REWARD = 100000000;

	// 	if (isNaN(reward.amount) || reward.amount <= 0 || reward.amount > MAXIMUM_REWARD
	// 		|| !ALLOWED_CURRENCIES.includes(reward.currencySymbol)) {
	// 		await guildMember.send(`<@${guildMember.user.id}>\n` +
	// 			'Please enter a valid reward value: \n ' +
	// 			'- 100 million maximum currency\n ' +
	// 			'- accepted currencies: ETH, BANK');
	// 		throw new ValidationError('invalid reward');
	// 	}
	// },

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
};

export default ScoapUtils;