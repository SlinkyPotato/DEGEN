import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	User,
} from 'discord.js';
import Log, { LogUtils } from '../Log';
import { DEGENButtonInteraction } from '../../types/DEGENButtonInteraction';
import { functionTable } from '../interactions/functionTable';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';

export const sendButtonInteraction = async (dEGENInteraction: DEGENButtonInteraction,
	dmChannel:DMChannel,
	user:User,
	discordUserDocument?: DiscordUserCollection,
): Promise<any> => {
	

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
			await functionTable(buttonFunctionToCall, payload);
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
};