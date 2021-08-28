import { MessageActionRow, MessageSelectMenu } from 'discord.js';
import constants from '../constants/constants';
import { scoapEmbedArray } from '../../app';
import { publishDraftScoapEmbed } from '../../service/scoap-squad/CreateNewScoapPoll';
import ScoapUtils from '../../utils/ScoapUtils';

export const scoapEmbedUpdate = async (botConvo, user_input): Promise<any> => {
	const scoapEmbedIndex = ScoapUtils.retrieveObjectFromArray(scoapEmbedArray, botConvo.getCurrentChannel());
	const scoapEmbed = scoapEmbedArray[scoapEmbedIndex];
	const scoapEmbed_fields = scoapEmbed.getEmbed()[0].fields;
	const botConvoResponseRecord_fields = botConvo.getConvo().user_response_record.embed[0].fields;
	const interaction_value = botConvo.getEditValue();
	switch (interaction_value) {
	case 'title':
		scoapEmbed.getEmbed()[0].title = user_input;
		botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
		publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
		botConvo.getConvo().user_response_record.embed[0].title = user_input;
		botConvo.setEdit(false);
		break;
	case 'summary':
		updateFieldValues(scoapEmbed_fields, 'Summary', user_input);
		botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
		publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
		botConvoResponseRecord_fields.Summary = user_input;
		botConvo.setEdit(false);
		break;
	case 'reward' :
		updateFieldValues(scoapEmbed_fields, 'Reward', user_input);
		botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
		publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
		botConvoResponseRecord_fields.Reward = user_input;
		botConvo.setEdit(false);
		break;
	default:
		if (botConvo.getCurrentMessageFlowIndex() === '6') {
			updateRoleFields(scoapEmbed_fields, interaction_value, user_input, 'ROLE_TITLE');
			const user_response_record_key = ScoapUtils.getKeyByValue(constants.EMOJIS, interaction_value);
			updateRoleFieldsBotConvoRecord(botConvo, user_response_record_key, user_input, 'ROLE_TITLE');
		} else if (botConvo.getCurrentMessageFlowIndex() === '7') {
			updateRoleFields(scoapEmbed_fields, interaction_value, user_input, 'ROLE_COUNT');
			const user_response_record_key = ScoapUtils.getKeyByValue(constants.EMOJIS, interaction_value);
			updateRoleFieldsBotConvoRecord(botConvo, user_response_record_key, user_input, 'ROLE_COUNT');
			botConvo.setCurrentMessageFlowIndex('8', botConvo.getCurrentChannel());
			publishDraftScoapEmbed(botConvo, scoapEmbed, botConvo.getCurrentChannel());
			botConvo.setEdit(false);
		}
	}

};

export const scoapEmbedEdit = (scoapEmbed): any => {
	const info_message = {
		color: '#0099ff',
		fields: [
			{
				name: '\u200b',
				value: 'Select below the content you want to edit',
			},
		],
		footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
	};
	const scoapEmbed_fields = scoapEmbed.getEmbed()[0].fields;
	const select_options = [
		{
			label: 'Edit project title',
			description: `Current value: ${scoapEmbed.getEmbed()[0].title}`,
			value: 'title',
		},
		{
			label: 'Edit project summary',
			description: `Current value: ${(retrieveFieldValues(scoapEmbed_fields, 'Summary')).slice(0, 100)}`,
			value: 'summary',
		},
		{
			label: 'Edit reward',
			description: `Current value: ${retrieveFieldValues(scoapEmbed_fields, 'Reward')}`,
			value: 'reward',
		},
	];

	for (const emoji of scoapEmbed.getVotableEmojiArray()) {
		console.log('EMOJI ', emoji);
		const role = retrieveRoleFields(scoapEmbed_fields, emoji);
		console.log('ROLE : ', role[0], role[1]);
		const role_count_str = `Wanted: ${role[1].name.substring(role[1].name.lastIndexOf('/') + 1, role[1].name.lastIndexOf(')'))}`;
		select_options.push({ label: role[0].name, description: role_count_str, value:emoji });
	}


	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('select')
				.setPlaceholder('Nothing selected')
				.addOptions(select_options),
		);
	const edit_message_object = { embeds: [info_message], components: [row] };
	return edit_message_object;
};


const updateFieldValues = (array, key, input) => {
	const obj = array.find(o => o.name === key);
	// console.log('OBJECT ', obj);
	if (obj !== 'undefined') {
		obj.value = input;
		return obj.value;
	} else {
		return 'Not defined, select to add now';
	}
	
};

const updateRoleFields = (array, key, input, option) => {
	const role = array.find(o => o.name.includes(key));
	const index = array.indexOf(role);
	const role_count = array[index + 1];
	switch(option) {
	case 'ROLE_TITLE':
		role.name = key + ' ' + input;
		return;
	case 'ROLE_COUNT':
		role_count.name = `0%(0/${input})`;
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

export const retrieveFieldValues = (array, key) => {
	const obj = array.find(o => o.name === key);
	// console.log('OBJECT ', obj);
	if (obj !== 'undefined') {
		return obj.value;
	} else {
		return 'Not defined, select to add now';
	}
	
};

export const retrieveRoleFields = (array, key) => {
	const role = array.find(o => o.name.includes(key));
	const index = array.indexOf(role);
	const role_count = array[index + 1];
	return [role, role_count];
};