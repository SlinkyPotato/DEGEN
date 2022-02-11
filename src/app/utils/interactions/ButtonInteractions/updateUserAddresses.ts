import { DEGENButtonInteraction } from '../../../types/interactions/DEGENButtonInteraction';
import { sendButtonInteraction } from '../../interactionBuilders/sendButtonInteraction';
import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import Log from '../../Log';

export const updateUserAddresses = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection): Promise<DEGENButtonInteraction> =>{
	Log.debug('Start updateUserAddresses interaction');
	const interaction: DEGENButtonInteraction = {
		prompt: 'What would you like to do now?',
		buttons: [
			{
				label: 'Connect a new account?',
				style: 'PRIMARY',
				function: 'walletConnect',
				successMessage: 'Great you should be good to go!',
				failureMessage: 'Looks like there was a problem, please try again. WalletConnect works better with some wallets than others.',
			}, {

				label: 'Change address DEGEN sends POAPs too.',
				style: 'PRIMARY',
				function: 'changePOAPAddress',
				successMessage: 'When you finish, dm me "gm" to make sure the connection was successful!',
				failureMessage: 'Something went wrong. Weird, I thought that would be easy.',
			},
			{
				label: 'Try sending a deeplink',
				style: 'PRIMARY',
				function: 'walletConnectDeepLink',
				successMessage: 'Great you should be good to go!',
				failureMessage: 'Looks like there was a problem, please try again. WalletConnect works better with some wallets than others.',
			},
			{
				label: 'Delete a public address.',
				style: 'PRIMARY',
				function: 'deleteAddressInteraction',
				successMessage: 'When you finish, dm me "gm" to make sure the connection was successful!',
				failureMessage: 'Something went wrong. Weird, I thought that would be easy.',
			}],
	};

	return sendButtonInteraction(interaction, user, dmChannel, discordUserDocument);
};