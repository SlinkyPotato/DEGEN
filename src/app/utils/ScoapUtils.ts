import constants from '../service/constants/constants';
import { scoapEmbedState, botConvoState, voteRecordState } from '../service/scoap-squad/ScoapDatabase';
import Log from './Log';

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
		if(message_content === '!skip' || message_content === '!Skip') {
			return true;
		}
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

	getKeyByValue(object: Record<string, any>, value: string): any {
		return Object.keys(object).find(key => object[key] === value);
	},

	purgeExpiredBotConvo(bot_convo_state: Record<string, any>, scoap_embed_state: Record<string, any>): void {
		if (Object.keys(bot_convo_state).length === 0 && bot_convo_state.constructor === Object) {
			return;
		}

		for (const key of Object.keys(bot_convo_state)) {
			const dtnow = +new Date();
			const dtold = bot_convo_state[key].getTimeout();
			const deltat = dtnow - dtold;
			if (deltat > constants.BOT_CONVERSATION_TIMEOUT_MS) {
				bot_convo_state[key].getCurrentChannel().send('Conversation timed out. please try again.');
				const scoapEmbed = scoapEmbedState[bot_convo_state[key].getScoapEmbedId()];
				delete bot_convo_state[bot_convo_state[key].getUserId()];
				if (!(typeof scoapEmbed === 'undefined')) {
					delete scoap_embed_state[scoapEmbed.getId()];
					this.logToFile(`object deleted from scoapEmbedState. Reason: BotConvo timeout, deltaT: ${deltat} \n` +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
				}
				this.logToFile(`object  deleted from botConvoState. reason: BotConvo timeout, deltaT: ${deltat} \n scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n botConvoState: ${JSON.stringify(botConvoState)}  \n voteRecordState: ${JSON.stringify(voteRecordState)}`);
			}
		}
		return;
	},

	logToFile(log_string: string): any {
		Log.debug(log_string);
	},
};

export default ScoapUtils;

