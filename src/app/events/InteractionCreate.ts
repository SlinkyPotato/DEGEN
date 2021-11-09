import interactionEditScoapDraft from './scoap-squad/interactionEditScoapDraft';
import { Interaction } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import ServiceUtils from '../utils/ServiceUtils';
import { LogUtils } from '../utils/Log';

export default class implements DiscordEvent {
	name = 'interactionCreate';
	once = false;

	async execute(interaction: Interaction): Promise<any> {
		if (ServiceUtils.isBanklessDAO(interaction.guild)) {
			if (interaction.isSelectMenu()) {
				await interactionEditScoapDraft(interaction).catch(e => {
					LogUtils.logError('scoap-squad interaction failed', e);
				});
			}
		}
	}
}