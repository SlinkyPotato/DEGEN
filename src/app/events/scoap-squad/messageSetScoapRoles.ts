import { publishDraftScoapEmbed } from '../../service/scoap-squad/CreateNewScoapPoll';
import { scoapEmbedArray, botConvoArray } from '../../app';
import { Message } from 'discord.js';
import constants from '../../service/constants/constants';
import { ScoapEmbed } from '../../service/scoap-squad/ScoapClasses';
import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';

export default async (message: Message): Promise<any> => {

	const botConvoIndex = retrieveObjectFromArray(botConvoArray, message.channel);
	if (botConvoIndex === -1) return;
	const botConvo = botConvoArray[botConvoIndex];

	if (messageIsValid(message, botConvo)) {

		if (botConvo.getEdit()) {
			scoapEmbedUpdate(botConvo, message.content);
		};

		switch (true) {
		case (botConvo.getCurrentMessageFlowIndex() === '2'):
			setUserResponseRecord(message.content, botConvo, 'TITLE');
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			break;
		case (botConvo.getCurrentMessageFlowIndex() === '3'):
			setUserResponseRecord(message.content, botConvo, 'SUMMARY');
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			break;
		case (botConvo.getCurrentMessageFlowIndex() === '4'):
			setUserResponseRecord(message.content, botConvo, 'REWARD');
			incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
			break;
		case (botConvo.getCurrentMessageFlowIndex() === '5'):
			switch (true) {
			case (validateTotalNumberOfRoles(message.content)):
				setUserResponseRecord(message.content, botConvo, 'NUMBER_OF_ROLES');
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
					setUserResponseRecord(message.content, botConvo, 'ROLE_TITLE');
					incrementMessageFlowIndex(botConvo, message, ['CORRECT', 1]);
					break;
				case (botConvo.getCurrentMessageFlowIndex() === '7'):
					setUserResponseRecord(message.content, botConvo, 'ROLE_COUNT');
					// if true we continue the loop
					if (getNumberOfRolesRecorded(botConvo) < getTotalNumberOfRoles(botConvo)) {
						setUserResponseRecord({}, botConvo, 'NEW_ROLE');
						incrementMessageFlowIndex(botConvo, message, ['CORRECT', -1]);
					// if true this is last iteration
					} else if (getNumberOfRolesRecorded(botConvo) == getTotalNumberOfRoles(botConvo)) {
						incrementMessageFlowIndex(botConvo, message, ['FINAL', +1]);
						// const scoapEmbedIndex = retrieveObjectFromArray(scoapEmbedArray, message.channel);
						// const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
						// console.log('USER RESPONSE', botConvo.getConvo().user_response_record);
						const scoapEmbed = createNewScoapEmbed(botConvo);
						Array(botConvo.getConvo().user_response_record.number_of_roles).fill(0).map((_, i) => {
							createScoapEmbedFields(botConvo, scoapEmbed, i);
							// console.log('AYE', i);
						});

						return publishDraftScoapEmbed(botConvo, scoapEmbed, message.channel);
					};
					break;
				}
			}
			break;
		}
		return;
	};
	return;
};

const createNewScoapEmbed = (botConvo): any => {
	const scoapEmbed = new ScoapEmbed();
	scoapEmbed.setEmbed(botConvo.getConvo().user_response_record.embed)
		.setScoapAuthor(botConvo.getConvo().user_response_record.user)
		.setVotableEmojiArray([])
		.setCurrentChannel(botConvo.getCurrentChannel())
		.setCurrentMessage(botConvo.getCurrentMessage());
	scoapEmbed.getEmbed()[0].fields.push({ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER });
	scoapEmbedArray.push(scoapEmbed);
	return scoapEmbed;
};

const createScoapEmbedFields = (botConvo, scoapEmbed, i) => {
	const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
	const emoji = constants.EMOJIS[(i + 1).toString()];
	scoapEmbed.getVotableEmojiArray().push(emoji);
	scoapEmbed.getEmbed()[0].fields.push(
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
	// return await message.channel.send(`Expected ${expected}, but received input "${message.content}". Please try again.`);
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
		// const [reward, symbol] = (ctx.options.assemble.new.reward != null) ? ctx.options.assemble.new.reward.split(' ') : [null, null];
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

const isInteger = (value) => {
	return /^\d+$/.test(value);
};
