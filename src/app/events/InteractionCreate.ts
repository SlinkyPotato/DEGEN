import interactionEditScoapDraft from './scoap-squad/interactionEditScoapDraft';
import { Interaction } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';

export default class implements DiscordEvent {
	name = 'interactionCreate';
	once = false;

	execute(interaction: Interaction): undefined {
		if (interaction.isSelectMenu()) {
			interactionEditScoapDraft(interaction).catch(e => {
				console.error('ERROR: ', e);
			});
		}
		return;
	}
}