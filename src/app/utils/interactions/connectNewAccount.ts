import { DEGENInteraction } from '../../types/DEGENInteraction';

export const connectNewAccount: DEGENInteraction = {
	prompt: 'No addresses found for your Discord ID. Please connect and ETH or MATIC address to recieve POAPs',
	buttons: [
		{
			label: 'Send QR Code to connect with WalletConnect',
			style: 'PRIMARY',
			function: 'walletConnect',
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