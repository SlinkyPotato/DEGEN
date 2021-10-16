import { Message, MessageActionRow, MessageSelectMenu } from 'discord.js';
import constants from '../constants/constants';
import { scoapEmbedState } from './ScoapDatabase';
import { publishDraftScoapEmbed } from './CreateNewScoapPoll';
import ScoapUtils from '../../utils/ScoapUtils';
import { incrementMessageFlowIndex } from './BotConversationMessageFlow';
import { BotConversation, ScoapEmbed } from './ScoapClasses';

export const scoapEmbedUpdate = async (botConvo: BotConversation, message: Message): Promise<any> => {
	const scoapEmbed = scoapEmbedState[botConvo.getScoapEmbedId()];
	const scoapEmbedFields = scoapEmbed.getEmbed()[0].fields;
	const botConvoResponseRecordFields = botConvo.getConvo().user_response_record.embed[0].fields;
	const interactionValue = botConvo.getEditValue();
	let userInput = message.content;
	switch (interactionValue) {
	case 'title':
		switch (true) {
		case (ScoapUtils.validateTitle(userInput)):
			scoapEmbed.getEmbed()[0].title = userInput;
			await botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
			await publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
			botConvo.getConvo().user_response_record.embed[0].title = userInput;
			botConvo.setEdit(false);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 250 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?\n']);
			return;
		}
		break;
	case 'summary':
		switch (true) {
		case (ScoapUtils.validateSummary(userInput)):
			updateFieldValues(scoapEmbedFields, 'Summary', userInput);
			await botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
			await publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
			botConvoResponseRecordFields.Summary = userInput;
			botConvo.setEdit(false);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 4000 characters maximum\n ' +
																		'- alphanumeric\n ' +
																		'- special characters: .!@#$%&,?\n']);
			return;
		}
		break;
	case 'reward' :
		switch (true) {
		case (ScoapUtils.validateReward(userInput)):
			if (userInput === '!skip' || userInput === '!Skip') {
				userInput = 'no reward defined';
			}
			updateFieldValues(scoapEmbedFields, 'Reward', userInput);
			await botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
			await publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
			botConvoResponseRecordFields.Reward = userInput;
			botConvo.setEdit(false);
			return;
		default:
			await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\n- 100 million maximum currency\n ' +
																		'- accepted currencies: ETH, BANK\n']);
			return;
		}
		break;
	default:
		if (botConvo.getCurrentMessageFlowIndex() === '6') {
			updateRoleFields(scoapEmbedFields, interactionValue, userInput, 'ROLE_TITLE');
			const userResponseRecordKey = ScoapUtils.getKeyByValue(constants.EMOJIS, interactionValue);
			updateRoleFieldsBotConvoRecord(botConvo, userResponseRecordKey, userInput, 'ROLE_TITLE');
		} else if (botConvo.getCurrentMessageFlowIndex() === '7') {
			if (ScoapUtils.validateTotalNumberOfPeoplePerRole(userInput)) {
				updateRoleFields(scoapEmbedFields, interactionValue, userInput, 'ROLE_COUNT');
				const userResponseRecordKey = ScoapUtils.getKeyByValue(constants.EMOJIS, interactionValue);
				updateRoleFieldsBotConvoRecord(botConvo, userResponseRecordKey, userInput, 'ROLE_COUNT');
				await botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
				await publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
				botConvo.setEdit(false);
			} else {
				await incrementMessageFlowIndex(botConvo, message, ['INCORRECT', '\nnumber between 1 and 1000\n']);
			}
		}
	}

};

export const scoapEmbedEdit = (scoapEmbed: ScoapEmbed): any => {
	const infoMessage = 'Select below the content you want to edit';
	const scoapEmbedFields = scoapEmbed.getEmbed()[0].fields;
	const selectOptions = [
		{
			label: 'Edit project title',
			description: `Current value: ${scoapEmbed.getEmbed()[0].title}`,
			value: 'title',
		},
		{
			label: 'Edit project summary',
			description: `Current value: ${(retrieveFieldValues(scoapEmbedFields, 'Summary')).slice(0, 100)}`,
			value: 'summary',
		},
		{
			label: 'Edit reward',
			description: `Current value: ${retrieveFieldValues(scoapEmbedFields, 'Reward')}`,
			value: 'reward',
		},
	];

	for (const emoji of scoapEmbed.getVotableEmojiArray()) {
		const role = retrieveRoleFields(scoapEmbedFields, emoji);
		const roleCountString = `Wanted: ${role[1].name.substring(role[1].name.lastIndexOf('/') + 1, role[1].name.lastIndexOf(')'))}`;
		selectOptions.push({ label: role[0].name, description: roleCountString, value:emoji });
	}


	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('select')
				.setPlaceholder('Nothing selected')
				.addOptions(selectOptions),
		);
	return { content: infoMessage, components: [row] };
};


const updateFieldValues = (array, key, input) => {
	const obj = array.find(o => o.name === key);
	if (!(typeof obj === 'undefined')) {
		obj.value = input;
		return obj.value;
	} else {
		array.splice(1, 0, { name: 'Reward', value: input });
	}
};

const updateRoleFields = (array, key, input, option) => {
	const role = array.find(o => o.name.includes(key));
	const index = array.indexOf(role);
	const roleCount = array[index + 1];
	switch(option) {
	case 'ROLE_TITLE':
		role.name = key + ' ' + input;
		return;
	case 'ROLE_COUNT':
		roleCount.name = `0%(0/${input})`;
		return;
	}
};

const updateRoleFieldsBotConvoRecord = (botConvo, key, input, option) => {
	const role = botConvo.getConvo().user_response_record.roles[key];
	switch(option) {
	case 'ROLE_TITLE':
		role.name = input;
		return;
	case 'ROLE_COUNT':
		role.role_count = input;
		return;
	}
};

export const retrieveFieldValues = (array: Array<any>, key: string): string => {
	const obj = array.find(o => o.name === key);
	if (!(typeof obj === 'undefined')) {
		return obj.value;
	} else {
		return 'Not defined, select to add now';
	}
	
};

export const retrieveRoleFields = (array: Array<any>, key:string): Array<any> => {
	const role = array.find(o => o.name.includes(key));
	const index = array.indexOf(role);
	const roleCount = array[index + 1];
	return [role, roleCount];
};