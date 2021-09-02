import interactionEditScoapDraft from './scoap-squad/interactionEditScoapDraft';
import { Interaction } from 'discord.js';

module.exports = {
	name: 'interactionCreate',
	once: false,

	execute(interaction: Interaction) {
		if (interaction.isSelectMenu()) {
			interactionEditScoapDraft(interaction).catch(e => {
				console.error('ERROR: ', e);
			});
		}
		
	},
};