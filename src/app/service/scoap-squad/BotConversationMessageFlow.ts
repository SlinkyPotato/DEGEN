import { publishDraftScoapEmbed } from './CreateNewScoapPoll';
// import { scoapEmbedState } from '../../app';
import constants from '../constants/constants';
import { ScoapEmbed } from './ScoapClasses';
import { Message } from 'discord.js';
import ScoapUtils from '../../utils/ScoapUtils';


export default async (message: Message, botConvo: any): Promise<any> => {

	switch (true) {
	case (botConvo.getCurrentMessageFlowIndex() === '2'):
		switch (true) {
		case (ScoapUtils.validateTitle(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'TITLE');
			}
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '- 250 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?']);
			return;
		}
		break;
	case (botConvo.getCurrentMessageFlowIndex() === '3'):
		switch (true) {
		case (ScoapUtils.validateSummary(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'SUMMARY');
			}
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '- 4000 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?']);
			return;
		}
		break;
	case (botConvo.getCurrentMessageFlowIndex() === '4'):
		switch (true) {
		case (ScoapUtils.validateReward(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'REWARD');
			}
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '- 100 million maximum currency\n ' +
																		'- accepted currencies: ETH, BANK']);
			return;
		}
		break;
	case (botConvo.getCurrentMessageFlowIndex() === '5'):
		switch (true) {
		case (ScoapUtils.validateTotalNumberOfRoles(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'NUMBER_OF_ROLES');
			}
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			incrementMessageFlowIndex(botConvo, message, ['INCORRECT', 'number between 1 and 9']);
			return;
		}
	case (botConvo.getCurrentMessageFlowIndex() === '6' || botConvo.getCurrentMessageFlowIndex() === '7'):
		if (!('roles' in botConvo.getConvo().user_response_record)) {
			initiateRolesRecord(botConvo);
		}
		if (getNumberOfRolesRecorded(botConvo) <= getTotalNumberOfRoles(botConvo)) {
			switch (true) {
			case (botConvo.getCurrentMessageFlowIndex() === '6'):
				switch (true) {
				case (ScoapUtils.validateTitle(message.content)):
					if (!botConvo.getEdit()) {
						setUserResponseRecord(message.content, botConvo, 'ROLE_TITLE');
					}
					incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
					break;
				default:
					incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '- 250 characters maximum\n ' +
																				'- alphanumeric\n ' +
																				'- special characters: .!@#$%&,?']);
					return;
				}
				break;
			case (botConvo.getCurrentMessageFlowIndex() === '7'):
				switch (true) {
				case (ScoapUtils.validateTotalNumberOfPeoplePerRole(message.content)):
					if (!botConvo.getEdit()) {
						setUserResponseRecord(message.content, botConvo, 'ROLE_COUNT');
					}
					// if true we continue the loop
					if (getNumberOfRolesRecorded(botConvo) < getTotalNumberOfRoles(botConvo)) {
						if (!botConvo.getEdit()) {
							setUserResponseRecord({}, botConvo, 'NEW_ROLE');
						}
						incrementMessageFlowIndex(botConvo, message, ['CORRECT', -1]);
					// if true this is last iteration
					} else if (getNumberOfRolesRecorded(botConvo) == getTotalNumberOfRoles(botConvo)) {
						incrementMessageFlowIndex(botConvo, message, ['FINAL', +1]);
						const scoapEmbed = createNewScoapEmbed(botConvo);
						Array(botConvo.getConvo().user_response_record.number_of_roles).fill(0).map((_, i) => {
							createScoapEmbedRoleFields(botConvo, scoapEmbed, i);
						});

						return publishDraftScoapEmbed(botConvo, scoapEmbed, message.channel);
					};
					return;
				default:
					incrementMessageFlowIndex(botConvo, message, ['INCORRECT', 'number between 1 and 1000']);
					return;
				}
				break;
			}
		}
		break;
	}
};


const createNewScoapEmbed = (botConvo): any => {
	const scoapEmbed = new ScoapEmbed();
	scoapEmbed.setEmbed(botConvo.getConvo().user_response_record.embed)
		.setScoapAuthor(botConvo.getConvo().user_response_record.user)
		.setVotableEmojiArray([])
		.setCurrentChannel(botConvo.getCurrentChannel())
		.setCurrentMessage(botConvo.getCurrentMessage());
	scoapEmbed.getEmbed()[0].fields.push({ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER });
	botConvo.setScoapEmbedId(scoapEmbed.getId());
	return scoapEmbed;
};

const createScoapEmbedRoleFields = (botConvo, scoapEmbed, i) => {
	const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
	const emoji = constants.EMOJIS[(i + 1).toString()];
	scoapEmbed.getVotableEmojiArray().push(emoji);
	scoapEmbed.getEmbed()[0].fields.push(
		{
			name: `${emoji} ${role.name}`,
			value: '\u200b',
			inline: true,
		},
		{
			name: `0%(0/${role.role_count})`,
			value: '\u200b',
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
	);
};

const getNumberOfRolesRecorded = (botConvo) => {
	return Object.keys(botConvo.getConvo().user_response_record.roles).length;
};

const initiateRolesRecord = (botConvo) => {
	botConvo.getConvo().user_response_record['roles'] = {};
	botConvo.getConvo().user_response_record.roles['1'] = {};
};

const getTotalNumberOfRoles = (botConvo) => {
	return botConvo.getConvo().user_response_record.number_of_roles;
};

const incrementMessageFlowIndex = async (botConvo, message, params) => {
	switch (params[0]) {
	case 'CORRECT':
		botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), await handleCorrectInput(message));
		break;
	case 'INCORRECT':
		botConvo.setCurrentMessageFlowIndex(botConvo.getCurrentMessageFlowIndex(), await handleIncorrectInput(message, params[1]));
		break;
	case 'FINAL':
		botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), message.channel);
		break;
	}
};

const handleIncorrectInput = async (message, expected) => {
	await message.channel.send({
		embeds: [{
			color: '#bf1304',
			fields: [
				{
					name: '\u200b',
					value: `Expected ${expected}, but received input "${message.content}". Please try again.`,
				},
			],
			footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
		}],
	});
	return message.channel;
} ;

const handleCorrectInput = async (message) => {
	await message.channel.send({
		embeds: [{
			color: '#32a852',
			fields: [
				{
					name: '\u200b',
					value: `Received input "${message.content}".`,
				},
			],
			footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
		}],
	});
	return message.channel;
} ;

const setUserResponseRecord = (record_entry, botConvo, option) => {
	switch (option) {
	case 'TITLE':
		botConvo.getConvo().user_response_record.embed[0].title = record_entry;
		break;
	case 'SUMMARY':
		botConvo.getConvo().user_response_record.embed[0].fields.push({ name: 'Summary', value: record_entry });
		break;
	case 'REWARD':
		if (record_entry === '!skip' || record_entry === '!Skip') {
			break;
		} else {
			botConvo.getConvo().user_response_record.embed[0].fields.push({ name: 'Reward', value: record_entry });
			break;
		}
	case 'NUMBER_OF_ROLES':
		botConvo.getConvo().user_response_record.number_of_roles = parseInt(record_entry);
		break;
	case 'ROLE_TITLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['name'] = record_entry;
		break;
	case 'ROLE_COUNT':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['role_count'] = record_entry;
		break;
	case 'NEW_ROLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo) + 1).toString()] = record_entry;
		break;
	}
};