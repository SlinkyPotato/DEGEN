import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageSelectMenu,
	User,
} from 'discord.js';
import Log, { LogUtils } from '../Log';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import { functionTable } from '../interactions/functionTable';
import { DEGENMenuInteraction } from '../../types/DEGENMenuInteraction';

export const sendMenuInteraction = async (
	dEGENInteraction: DEGENMenuInteraction,
	dmChannel:DMChannel,
	user:User,
	discordUserDocument: DiscordUserCollection | null): Promise<any> => {
	

	const { prompt, menuOptions, functionToCall } = dEGENInteraction;
	const payload = { dmChannel, user, discordUserDocument };
    
	Log.debug('Menu interaction started');
	const row = new MessageActionRow()
		.addComponents(
			new MessageSelectMenu()
				.setCustomId('select')
				.setPlaceholder('Please Select an Option')
				.addOptions(menuOptions),
		);
	Log.debug('Made it pst row');
	const message: Message | void = await dmChannel.send({
		content: prompt,
		components: [row],
	}).catch(e => {
		LogUtils.logError(`sendMessageWithInteractions failed ${e}`, e);
		return;
	});
		
	if (message == null) {
		Log.debug('Did not send opt-in message');
		return;
	}
        
	// 5 minute timeout
	try {
		// const menuIds = interactions.map(items => items.value);
		await message.awaitMessageComponent({
			filter: args => (args.customId === 'select') && args.user.id == user.id.toString(),
			componentType: 'SELECT_MENU',
			time: 100_000,
		})
			.then(async (interaction) => {
				Log.debug(functionToCall);
				if (interaction.customId === 'select') {
					Log.debug('interaction');
					const selectedItemDescription = menuOptions[parseInt(interaction.values[0])].description;
					const result = await functionTable(functionToCall, payload, selectedItemDescription);
					Log.debug(result);
					try {
						await dmChannel.send({ content: result });
						return;
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
	
