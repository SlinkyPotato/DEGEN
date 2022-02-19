import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageSelectMenu,
	User,
} from 'discord.js';
import Log, { LogUtils } from '../Log';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import { functionTable } from '../../service/WalletConnect/interactions/functionTable';
import { DEGENMenuInteraction } from '../../types/interactions/DEGENMenuInteraction';

export const sendMenuInteraction = async (
	dEGENInteraction: DEGENMenuInteraction,
	dmChannel:DMChannel,
	user:User,
	discordUserDocument: DiscordUserCollection): Promise<any> => {
	
	Log.debug('Menu interaction started');

	const { prompt, menuOptions, functionToCall } = dEGENInteraction;
	const payload = { dmChannel, user, discordUserDocument };
    
	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('select')
				.setPlaceholder('Please Select an Option')
				.addOptions(menuOptions),
		);
	
        
	try {

		Log.debug('Sending menu interaction to user');
		const message: Message | void = await dmChannel.send({
			content: prompt,
			components: [row],
		}).catch(e => {
			LogUtils.logError('sendMessageWithInteractions failed', e);
			return;
		});
		
		if (message == null) {
			Log.debug('Message does not exist');
			return;
		}
		
		await message.awaitMessageComponent({
			filter: args => (args.customId === 'select') && args.user.id == user.id.toString(),
			componentType: 'SELECT_MENU',
			time: 10000,
		})
			.then(async (interaction) => {
				Log.debug(functionToCall);
				if (interaction.customId === 'select') {
					Log.debug('Button Selected');
					const selectedItemDescription = menuOptions[parseInt(interaction.values[0])].description;
					const result = await functionTable(functionToCall, payload, selectedItemDescription);
					try {
						Log.debug('Sending result to user.');
						return message.edit({ content: result, components:[] });
					} catch (e) {
						LogUtils.logError('Error reply-ing to interaction', e);
						throw e;
					}
				}
			})
			.catch(error => {
				try {
					message.edit({ content: 'Timeout reached, please reach out to us with any questions!' }).catch(e => {
						Log.warn(e);
						return;
					});
					Log.debug(error?.message);
				} catch (e) {
					LogUtils.logError('gm opt-in message edit occurred', e);
				}
			});
	} catch (e) {
		LogUtils.logError('gm opt-in time/error occurred', e);
		return;
	}
};
	
