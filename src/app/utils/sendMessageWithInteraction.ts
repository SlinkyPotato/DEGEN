import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	MessageSelectMenu,
	User,
} from 'discord.js';
import Log, { LogUtils } from './Log';
import { v1WalletConnect } from './v1WalletConnect';
import { sendLinkToWebsite } from './sendLinkToWebsite';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';
import { changePOAPAddressInteraction } from './interactions/changePOAPAddressInteraction';
import { DEGENInteraction } from '../types/DEGENInteraction';
import { updatePOAPDAddress } from './mongoDbOperations/updatePOAPDeliveryAddress';
import { deletUserAddressInteraction } from './interactions/deleteUserAddressInteraction';
import { deleteUserAddress } from './mongoDbOperations/deleteUserAddress';
export const sendMessageWithInteractions = async (
	dEGENInteraction: DEGENInteraction,
	dmChannel:DMChannel,
	user:User,
	discordUserDocument: DiscordUserCollection | null): Promise<any> => {
    
	const functionTable = async (functionToCall: string, args:any): Promise<any> => {
		const connectedAddresses = discordUserDocument?.connectedAddresses ? discordUserDocument.connectedAddresses : null;
		if (functionToCall === 'walletConnect') {
            const nickname = await chooseANickName(user, dmChannel, connectedAddresses);
			return await v1WalletConnect(user, dmChannel, connectedAddresses);
		} if (functionToCall === 'changePOAPAddress' && discordUserDocument && connectedAddresses) {
			return await changePOAPAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
		} if (functionToCall === 'updatePOAPAddress' && connectedAddresses) {
			return await updatePOAPDAddress(user, args);
		} if (functionToCall === 'deleteAddressInteraction' && connectedAddresses && discordUserDocument) {
			return await deletUserAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
		} if (functionToCall === 'deleteUserAddress') {
			return await deleteUserAddress(user, args);
		} else {
			return await sendLinkToWebsite();
		}
	};

	const { prompt, buttons, menuOptions, functionToCall } = dEGENInteraction;
    

	if (buttons) {
		const messageButtons: MessageButton[] = buttons.map((button, i) => {
			return new MessageButton()
				.setCustomId(i.toString())
				.setLabel(button.label)
				.setStyle(button.style);
		});
		const row = new MessageActionRow().addComponents(messageButtons);
		const message: Message | void = await dmChannel.send({
			content: prompt,
			components: [row],
		}).catch(e => {
			LogUtils.logError('sendMessageWithInteractions failed', e);
			return;
		});
        
		if (message == null) {
			Log.debug('Did not send opt-in message');
			return;
		}
        
		// 5 minute timeout
		try {
			const buttonIds = messageButtons.map(button => button.customId);
			Log.debug({ buttonIds });
			await message.awaitMessageComponent({
				filter: args => (args.customId in buttonIds) && args.user.id == user.id.toString(),
				time: 100_000,
			}).then(async (interaction) => {
				const buttonFunctionToCall:string = buttons[parseInt(interaction.customId)].function;
				Log.debug(buttonFunctionToCall);
				await functionTable(buttonFunctionToCall, null);
			}).catch(error => {
				try {
					message.edit({ content: 'Timeout reached, please reach out to us with any questions!', components: [] }).catch(e => {
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
	}

	if (menuOptions && functionToCall) {
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
						const result = await functionTable(functionToCall, selectedItemDescription);
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
	}
	
	Log.debug('user settings update skipped');
};

