import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	User,
} from 'discord.js';
import Log, { LogUtils } from '../Log';
import { DEGENButtonInteraction } from '../../types/interactions/DEGENButtonInteraction';
import { functionTable } from '../interactions/functionTable';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';

export const sendButtonInteraction = async (
	dEGENInteraction: DEGENButtonInteraction,
	user:User,
	dmChannel:DMChannel,
	discordUserDocument: DiscordUserCollection,
): Promise<any> => {
	
	Log.debug('start sendButtonInteraction');
	const { prompt, buttons } = dEGENInteraction;
	const payload = { dmChannel, user, discordUserDocument };

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
		Log.debug('Did not send button interaction.');
		return;
	}
        
	// 5 minute timeout
	try {
		const buttonIds = messageButtons.map(button => button.customId);
		await message.awaitMessageComponent({
			filter: args => (args.customId in buttonIds) && args.user.id == user.id.toString(),
			time: 100_000,
		}).then(async (interaction) => {
			const buttonFunctionToCall:string = buttons[parseInt(interaction.customId)].function;
			Log.debug(buttonFunctionToCall);
			await functionTable(buttonFunctionToCall, payload);
		}).catch(error => {
			try {
				message.edit({ content: 'Timeout reached, please reach out to us with any questions!', components: [] }).catch(e => {
					Log.warn(e);
					return;
				});
				Log.debug(error?.message);
			} catch (e) {
				LogUtils.logError('Error in sendButtonInteraction', e);
			}
		});
	} catch (e) {
		LogUtils.logError('Error in sendButtonInteraction', e);
		return;
	}
};