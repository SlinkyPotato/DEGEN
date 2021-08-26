import { botConvoArray } from '../../app';
import { SelectMenuInteraction } from 'discord.js';
import ScoapUtils from '../../utils/ScoapUtils';
// import { retrieveFieldValues, retrieveRoleFields } from '../../service/scoap-squad/EditScoapDraft';
// import { scoapEmbedUpdate } from '../../service/scoap-squad/EditScoapDraft';

export default async (interaction: SelectMenuInteraction): Promise<any> => {
	const botConvoIndex = ScoapUtils.retrieveObjectFromArray(botConvoArray, interaction.channel);
	const botConvo = botConvoArray[botConvoIndex];
	if (interactionIsValid(interaction, botConvo)) {
		botConvo.setEdit(true);
		botConvo.setEditValue(interaction.values[0]);
		const interaction_value = interaction.values[0];
		switch (interaction_value) {
		case 'title':
			botConvo.setCurrentMessageFlowIndex('2', interaction.channel);
			break;
		case 'summary':
			botConvo.setCurrentMessageFlowIndex('3', interaction.channel);
			break;
		case 'reward' :
			botConvo.setCurrentMessageFlowIndex('4', interaction.channel);
			break;
		default:
			if (botConvo.getCurrentMessageFlowIndex() === '6') {
				botConvo.setCurrentMessageFlowIndex('7', interaction.channel);
			} else {
				botConvo.setCurrentMessageFlowIndex('6', interaction.channel);
			}
		}
	}
};

const interactionIsValid = (interaction, botConvo) => {
	// returns true if this message is a direct response to botConvo.current_message
	return (interaction.channel.messages.cache.lastKey(1)[0] === botConvo.getCurrentMessage().id);
};

// const retrieveObjectFromArray = (array, channel) => {
// 	// map message to correct botConvo / scoapEmbed object
// 	return array.map(x => x.current_channel).indexOf(channel);
// };