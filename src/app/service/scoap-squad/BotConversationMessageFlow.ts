import { publishDraftScoapEmbed } from './CreateNewScoapPoll';
import constants from '../constants/constants';
import { ScoapEmbed, BotConversation } from './ScoapClasses';
import { Message, TextBasedChannels } from 'discord.js';
import ScoapUtils from '../../utils/ScoapUtils';
import { scoapEmbedState, botConvoState, voteRecordState } from './ScoapDatabase';


export default async (message: Message, botConvo: BotConversation): Promise<any> => {
	switch (true) {
	case (botConvo.getCurrentMessageFlowIndex() === '2'):
		switch (true) {
		case (ScoapUtils.validateTitle(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'TITLE');
			}
			await incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 250 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?\n']);
			return;
		}
	case (botConvo.getCurrentMessageFlowIndex() === '3'):
		switch (true) {
		case (ScoapUtils.validateSummary(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'SUMMARY');
			}
			await incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 4000 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?\n']);
			return;
		}
	case (botConvo.getCurrentMessageFlowIndex() === '4'):
		switch (true) {
		case (ScoapUtils.validateReward(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'REWARD');
			}
			await incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 100 million maximum currency\n ' +
																		'- accepted currencies: ETH, BANK\n']);
			return;
		}
	case (botConvo.getCurrentMessageFlowIndex() === '5'):
		switch (true) {
		case (ScoapUtils.validateTotalNumberOfRoles(message.content)):
			if (!botConvo.getEdit()) {
				setUserResponseRecord(message.content, botConvo, 'NUMBER_OF_ROLES');
			}
			await incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\nnumber between 1 and 9\n']);
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
					await incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
					break;
				default:
					await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 250 characters maximum\n ' +
																				'- alphanumeric\n ' +
																				'- special characters: .!@#$%&,?\n']);
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
						await incrementMessageFlowIndex(botConvo, message, ['CORRECT', -1]);
					// if true this is last iteration
					} else if (getNumberOfRolesRecorded(botConvo) == getTotalNumberOfRoles(botConvo)) {
						await incrementMessageFlowIndex(botConvo, message, ['FINAL', +1]);
						const scoapEmbed = createNewScoapEmbed(botConvo);
						Array(botConvo.getConvo().user_response_record.number_of_roles).fill(0).map((_, i) => {
							createScoapEmbedRoleFields(botConvo, scoapEmbed, i);
						});

						await publishDraftScoapEmbed(botConvo, scoapEmbed, message.channel);
						return;
					}
					return;
				default:
					await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\nnumber between 1 and 1000\n']);
					return;
				}
				break;
			}
		}
		break;
	}
};


const createNewScoapEmbed = (botConvo: BotConversation): ScoapEmbed => {
	const scoapEmbed = new ScoapEmbed();
	scoapEmbed.setEmbed(botConvo.getConvo().user_response_record.embed)
		.setScoapAuthor(botConvo.getConvo().user_response_record.user)
		.setVotableEmojiArray([])
		.setCurrentChannel(botConvo.getCurrentChannel())
		.setCurrentMessage(botConvo.getCurrentMessage());
	scoapEmbed.getEmbed()[0].fields.push({ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER, inline: false });
	botConvo.setScoapEmbedId(scoapEmbed.getId());
	// has to be done here, otherwise edit function does not work
	scoapEmbedState[scoapEmbed.getId()] = scoapEmbed;
	ScoapUtils.logToFile('object added to scoapEmbedState. Reason: draftScoapEmbed created \n' +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	return scoapEmbed;
};

const createScoapEmbedRoleFields = (botConvo: BotConversation, scoapEmbed: ScoapEmbed, i: number): void => {
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

const getNumberOfRolesRecorded = (botConvo: BotConversation): number => {
	return Object.keys(botConvo.getConvo().user_response_record.roles).length;
};

const initiateRolesRecord = (botConvo: BotConversation): void => {
	botConvo.getConvo().user_response_record['roles'] = {};
	botConvo.getConvo().user_response_record.roles['1'] = {};
};

const getTotalNumberOfRoles = (botConvo: BotConversation): number => {
	return botConvo.getConvo().user_response_record.number_of_roles;
};

export const incrementMessageFlowIndex = async (botConvo: BotConversation, message: Message, params: Array<any>): Promise<void> => {
	switch (params[0]) {
	case 'CORRECT':
		await botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), message.channel);
		break;
	case 'INCORRECT':
		await botConvo.setCurrentMessageFlowIndex(botConvo.getCurrentMessageFlowIndex(), await handleIncorrectInput(message, params[1]));
		break;
	case 'FINAL':
		await botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), message.channel);
		break;
	}
};

const handleIncorrectInput = async (message: Message, expected: string): Promise<TextBasedChannels> => {
	await message.channel.send({
		content: `Valid input: ${expected} \n but received input "${message.content}". Please try again.`,
	});
	return message.channel;
} ;

const setUserResponseRecord = (recordEntry: any, botConvo: BotConversation, option: string): void => {
	switch (option) {
	case 'TITLE':
		botConvo.getConvo().user_response_record.embed[0].title = recordEntry;
		break;
	case 'SUMMARY':
		botConvo.getConvo().user_response_record.embed[0].fields.push({ name: 'Summary', value: recordEntry });
		break;
	case 'REWARD':
		if (recordEntry === '!skip' || recordEntry === '!Skip') {
			break;
		} else {
			botConvo.getConvo().user_response_record.embed[0].fields.push({ name: 'Reward', value: recordEntry });
			break;
		}
	case 'NUMBER_OF_ROLES':
		botConvo.getConvo().user_response_record.number_of_roles = parseInt(recordEntry);
		break;
	case 'ROLE_TITLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['name'] = recordEntry;
		break;
	case 'ROLE_COUNT':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['role_count'] = recordEntry;
		break;
	case 'NEW_ROLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo) + 1).toString()] = recordEntry;
		break;
	}
};