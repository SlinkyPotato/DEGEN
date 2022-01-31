import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	User,
} from 'discord.js';
import buttonIds from '../constants/buttonIds';

export default sendMessageWithInteractions= async () => {
    const row: MessageActionRow = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(buttonIds.CONNECT_OPT_IN_YES)
					.setLabel('Send QR Code')
					.setStyle('PRIMARY'),
				new MessageButton()
					.setCustomId(buttonIds.CONNECT_OPT_IN_NO)
					.setLabel('No POAPs Plz')
					.setStyle('SECONDARY'),
			);
		const message: Message | void = await dmChannel.send({
			content: 'Use WalletConnect to connect your wallet to get POAPs directly to you wallet.',
			components: [row],
		}).catch(e => {
			LogUtils.logError('failed to ask for opt-in', e);
			return;
		});
	
		if (message == null) {
			Log.debug('did not send opt-in message');
			return;
		}
	
		// 5 minute timeout
		try {
			await message.awaitMessageComponent({
				filter: args => (args.customId == buttonIds.CONNECT_OPT_IN_YES
				|| args.customId == buttonIds.CONNECT_OPT_IN_NO) && args.user.id == user.id.toString(),
				time: 300_000,
			}).then(async (interaction) => {
				if (interaction.customId == buttonIds.CONNECT_OPT_IN_YES) {
					await v1WalletConnect(user, dmChannel);
				} else {
					message.edit({ content: 'No problem!', components: [] });
				}
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
		Log.debug('user settings update skipped');
	}
}