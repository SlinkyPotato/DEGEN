import { botConvoState } from '../../service/scoap-squad/ScoapDatabase';
import { SelectMenuInteraction } from 'discord.js';

export default async (interaction: SelectMenuInteraction): Promise<any> => {

	const botConvo = botConvoState[interaction.user.id];
	if (await interactionIsValid(interaction, botConvo)) {
		botConvo.setEdit(true);
		botConvo.setEditValue(interaction.values[0]);
		const interaction_value = interaction.values[0];
		switch (interaction_value) {
		case 'title':
			await botConvo.setCurrentMessageFlowIndex('2', interaction.channel);
			break;
		case 'summary':
			await botConvo.setCurrentMessageFlowIndex('3', interaction.channel);
			break;
		case 'reward' :
			await botConvo.setCurrentMessageFlowIndex('4', interaction.channel);
			break;
		default:
			if (await botConvo.getCurrentMessageFlowIndex() === '6') {
				await botConvo.setCurrentMessageFlowIndex('7', interaction.channel);
			} else {
				await botConvo.setCurrentMessageFlowIndex('6', interaction.channel);
			}
		}
	}
};

const interactionIsValid = async (interaction, botConvo) => {
	// returns true if this message is a direct response to botConvo.current_message
	return (await interaction.channel.messages.cache.lastKey(1)[0] === botConvo.getCurrentMessage().id);
};