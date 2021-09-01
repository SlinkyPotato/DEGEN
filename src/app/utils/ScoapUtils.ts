// import constants from '../service/constants/constants';
// import { GuildMember, Message } from 'discord.js';

const isInteger = (value: any): boolean => {
	return /^\d+$/.test(value);
};

const ScoapUtils = {

	validateTotalNumberOfRoles(message_content: string): boolean {
		return (isInteger(message_content) && (parseInt(message_content) < 10) && (parseInt(message_content) >= 1));
	},

	validateTotalNumberOfPeoplePerRole(message_content: string): boolean {
		return (isInteger(message_content) && (parseInt(message_content) < 1000) && (parseInt(message_content) >= 1));
	},

	validateSummary(summary: string): boolean {
		const CREATE_SUMMARY_REGEX = /^[\w\s.!@#$%&,?']{1,4000}$/;
		return (!(summary == null || !CREATE_SUMMARY_REGEX.test(summary)));
	},

	validateReward(message_content: string): boolean {
		const [reward, symbol] = (message_content != null) ? message_content.split(' ') : [null, null];
		const amount = parseInt(reward);
		const ALLOWED_CURRENCIES = ['ETH', 'BANK'];
		const MAXIMUM_REWARD = 100000000;
		return (!(isNaN(amount) || amount <= 0 || amount > MAXIMUM_REWARD
					|| !ALLOWED_CURRENCIES.includes(symbol)));
	},

	validateTitle(title: string): boolean {
		const CREATE_TITLE_REGEX = /^[\w\s.!@#$%&,?']{1,250}$/;
		return (!(title == null || !CREATE_TITLE_REGEX.test(title)));
	},

	getKeyByValue(object: any, value: string): any {
		return Object.keys(object).find(key => object[key] === value);
	},
};

export default ScoapUtils;

