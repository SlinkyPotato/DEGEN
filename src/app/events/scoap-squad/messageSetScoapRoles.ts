import { handleScoapDraftReaction } from '../../service/scoap-squad/CreateNewScoapPoll';
import { scoapEmbedArray, botConvoArray } from '../../app';
import { Message } from 'discord.js';
import constants from '../../service/constants/constants';

export default async (message: Message): Promise<any> => {

	const botConvoIndex = retrieveObjectFromArray(botConvoArray, message.channel);
	if (botConvoIndex === -1) return;
	const botConvo = botConvoArray[botConvoIndex];

	
	if (messageIsValid(message, botConvo)) {
		if (!(hasUserResponse(botConvo))) {
			switch (true) {
			case (validateTotalNumberOfRoles(message.content)):
				setUserResponseRecord(message.content, botConvo, 'TOTAL_ROLES');
				incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
				return;
			default:
				incrementMessageFlowIndex(botConvo, message, ['INCORRECT', 'number between 1 and 9']);
				return;
			}
		} else if (hasUserResponse(botConvo)) {
			if (!('roles' in botConvo.getConvo().user_response_record)) {
				initiateRolesRecord(botConvo);
			}
			if (getNumberOfRolesRecorded(botConvo) <= getTotalNumberOfRoles(botConvo)) {
				switch (true) {
				case (botConvo.getCurrentMessageFlowIndex() === '2'):
					incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
					setUserResponseRecord(message.content, botConvo, 'ROLE_TITLE');
					break;
				case (botConvo.getCurrentMessageFlowIndex() === '3'):
					setUserResponseRecord(message.content, botConvo, 'ROLE_COUNT');
					// if true we continue the loop
					if (getNumberOfRolesRecorded(botConvo) < getTotalNumberOfRoles(botConvo)) {
						setUserResponseRecord({}, botConvo, 'NEW_ROLE');
						incrementMessageFlowIndex(botConvo, message, ['CORRECT', -1]);
					// if true this is last iteration
					} else if (getNumberOfRolesRecorded(botConvo) == getTotalNumberOfRoles(botConvo)) {
						incrementMessageFlowIndex(botConvo, message, ['FINAL', +1]);
						const scoapEmbedIndex = retrieveObjectFromArray(scoapEmbedArray, message.channel);
						const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
						
						Array(parseInt(botConvo.getConvo().user_response_record['1'])).fill(0).map((_, i) => {
							createScoapEmbedFields(botConvo, scoapEmbed, i);
						});

						const verifyMessage = await message.channel.send('Please verify the final draft', { embed: scoapEmbed.getEmbed() });
						await verifyMessage.react('👍');
						await verifyMessage.react('❌');

						return handleScoapDraftReaction('PUBLISH', [verifyMessage, scoapEmbed, botConvo]);

					};
					break;
				}
			}
		}

		return;
	};

	return;
};

const createScoapEmbedFields = (botConvo, scoapEmbed, i) => {
	const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
	const emoji = constants.EMOJIS[(i + 1).toString()];
	scoapEmbed.getVotableEmojiArray().push(emoji);

	scoapEmbed.getEmbed().fields.push(
		{
			name: `${emoji} ${role.title}`,
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
	return Object.keys(botConvo.getConvo().user_response_record['roles']).length;
};

const initiateRolesRecord = (botConvo) => {
	botConvo.getConvo().user_response_record['roles'] = {};
	botConvo.getConvo().user_response_record.roles['1'] = {};
};

const getTotalNumberOfRoles = (botConvo) => {
	return parseInt(botConvo.getConvo().user_response_record['1']);
};

const incrementMessageFlowIndex = async (botConvo, message, params) => {
	switch (params[0]) {
	case 'CORRECT':
		botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), await handleCorrectInput(message));
		break;
	case 'INCORRECT':
		botConvo.setCurrentMessageFlowIndex(botConvo.getCurrentMessageFlowIndex(), await handleWrongInput(message, params[1]));
		break;
	case 'FINAL':
		botConvo.setCurrentMessageFlowIndex((parseInt(botConvo.getCurrentMessageFlowIndex()) + params[1]).toString(), message);
		break;
	}
};

const handleWrongInput = async (message, expected) => {
	return await message.channel.send(`Expected ${expected}, but received input "${message.content}". Please try again.`);
} ;

const handleCorrectInput = async (message) => {
	return await message.channel.send(`Received input "${message.content}".`);
} ;

const setUserResponseRecord = (record_entry, botConvo, option) => {
	switch (option) {
	case 'TOTAL_ROLES':
		botConvo.getConvo().user_response_record[botConvo.getCurrentMessageFlowIndex()] = record_entry;
		break;
	case 'ROLE_TITLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['title'] = record_entry;
		break;
	case 'ROLE_COUNT':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo)).toString()]['role_count'] = record_entry;
		break;
	case 'NEW_ROLE':
		botConvo.getConvo().user_response_record.roles[(getNumberOfRolesRecorded(botConvo) + 1).toString()] = record_entry;
		break;
	}
};

const validateTotalNumberOfRoles = (message_content) => {
	return (isInteger(message_content) && (parseInt(message_content) < 10) && (parseInt(message_content) >= 1));
};

const messageIsValid = (message, botConvo) => {
	// returns true if this message is a direct response to botConvo.current_message
	return (message.channel.messages.cache.lastKey(2)[0] === botConvo.getCurrentMessage().id);
};

const retrieveObjectFromArray = (array, channel) => {
	// map message to correct botConvo / scoapEmbed object
	return array.map(x => x.current_channel).indexOf(channel);
};

const hasUserResponse = (botConvo) => {
	return ('1' in botConvo.getConvo().user_response_record);
};

const isInteger = (value) => {
	return /^\d+$/.test(value);
};
