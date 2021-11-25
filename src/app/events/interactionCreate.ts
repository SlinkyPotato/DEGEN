import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Interaction } from 'discord.js';

export default class implements DiscordEvent {
	name = 'interactionCreate';
	once = false;
	
	async execute(_: Interaction): Promise<any> {
	// 	if (!interaction.isCommand()) return;
	// 	const messageEmbedOptions: MessageEmbedOptions = {
	// 		title: 'POAP link',
	// 		description: 'Thank you for participating in the community event!',
	// 		fields: [
	// 			{ name: 'Discord', value: 'test', inline: false },
	// 			{ name: 'Event', value: 'test', inline: true },
	// 			{ name: 'Claim Link', value: 'test', inline: true },
	// 		],
	// 	};
	// 	switch (interaction.commandName) {
	// 	case 'poap':
	// 		await interaction.reply({
	// 			embeds: [messageEmbedOptions],
	// 			ephemeral: true,
	// 		});
	// 		break;
	// 	default:
	// 		console.log('something else');
	// 	}
	}
}