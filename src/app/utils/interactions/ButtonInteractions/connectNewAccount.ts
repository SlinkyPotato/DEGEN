import { DEGENButtonInteraction } from '../../../types/interactions/DEGENButtonInteraction';
import { sendButtonInteraction } from '../../interactionBuilders/sendButtonInteraction';
import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import Log from '../../Log';

export const connectNewAccount = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection): Promise<DEGENButtonInteraction> => {
	Log.debug('connectNewAccount started');

	const interaction: DEGENButtonInteraction = {
		prompt: 'No addresses found for your Discord ID. Please connect and ETH or MATIC address to recieve POAPs',
		buttons: [
			{
				label: 'Send QR Code to connect with WalletConnect',
				style: 'PRIMARY',
				function: 'walletConnect',
				successMessage: 'Great you should be good to go!',
				failureMessage: 'Looks like there was a problem, please try again. WalletConnect works better with some wallets than others.',
			},
			{
				label: 'Try sending a deeplink',
				style: 'PRIMARY',
				function: 'walletConnectDeepLink',
				successMessage: 'Great you should be good to go!',
				failureMessage: 'Looks like there was a problem, please try again. WalletConnect works better with some wallets than others.',
			}, {
				label: 'Check out our website!',
				style: 'PRIMARY',
				function: 'Send link to website',
				successMessage: 'When you finish, dm me "gm" to make sure the connection was successful!',
				failureMessage: 'Something went wrong. Weird, I thought that would be easy.',
			}],
	};

	return sendButtonInteraction(interaction, user, dmChannel, discordUserDocument);
};