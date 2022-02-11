import WalletConnect from '@walletconnect/client';
import { DMChannel, User, MessageAttachment } from 'discord.js';
import Canvas from 'canvas';
import QRCode from 'qrcode';
import Log from './Log';

import { convertUtf8ToHex } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { ConnectedAddress } from '../types/discord/ConnectedAddress';
import { addUserAddress } from './mongoDbOperations/addUserAddress';
import { getChain } from 'evm-chains';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';

export const v1WalletConnect = async (user: User, dmChannel: DMChannel, discordUserDocument: DiscordUserCollection):Promise<any> => {
// Create a connector
	Log.debug('starting v1 WalletConnect');
	let uri;
	const connector = new WalletConnect({
		bridge: 'https://bridge.walletconnect.org',
		clientMeta: {
			name: 'DEGEN',
			description: 'POAPs directly to your wallet',
			url: 'www.DEGEN.com',
			icons: ['does not exist yet'],
		},
	});

	// Check if connection is already established
	if (!connector.connected) {
		// create new session
		await connector.createSession();
		const canvas = Canvas.createCanvas(244, 244);
		await QRCode.toCanvas(canvas, connector.uri);
		const attachment = new MessageAttachment(canvas.toBuffer(), 'qr-code.png');
		try {
			if (dmChannel) {
				await dmChannel.send({ content: 'Scan the QR code with your mobile app connect to DEGEN, and sign the message to verify you own the address to connect to DEGEN.', files: [attachment] });
			}
		} catch (e) {
			return e;
		}
	}
	

	connector.on('display_uri', async (error, payload) => {
		if (error) {
			throw error;
		}
		uri = payload.params[0];
		Log.debug(`Display_URI: ${uri}`);
		
	});
	// Subscribe to connection events
	connector.on('connect', async (error, payload) => {
		if (error) {
			throw error;
		}
		// Get provided accounts and chainId
		Log.debug(payload.params[0]);
		const chainId = payload.params[0].chainId.toString();
		const { accounts }: {accounts: string[0]} = payload.params[0];
		const addressToConnect: ConnectedAddress = { address: accounts[0], chainId };
		const { connectedAddresses } = discordUserDocument;
		try {
			// if the address is already connected, notify user
			if (connectedAddresses) {
				const addressAlreaadyConected: boolean = connectedAddresses.some(item => item.address === addressToConnect.address && item.chainId === addressToConnect.chainId.toString());
				if (addressAlreaadyConected) {
					Log.debug('Address is already connected');
					return await dmChannel.send(`Address: ${accounts[0]} is already connected`);
				}
			}
			// sign a message from the connected account
			await dmChannel.send('Please sign the message from your wallet. If the message does not appear in your wallet, please try again with <gm>.');
			const signedMessage = await signMessage(connector, user, accounts);
			if (signedMessage) {
				Log.debug('User sucessfully signed message. Adding connection to DB.');
				const result = await addUserAddress(user, addressToConnect);
				Log.debug(`Result: ${result}`);
				if (result) {
					await dmChannel.send({ content: `Connected ${user.tag} to ${getChain(parseInt(chainId)).name}: ${accounts}` });
				}
			} else {
				Log.debug('signMessage returned false');
			}
			
		} catch (e) {
			return e;
		}
		Log.debug(`accounts: ${accounts}, chainId: ${chainId}`);
	});

	connector.on('session_update', (error, payload) => {
		if (error) {
			throw error;
		}
		// Get updated accounts and chainId
		const { accounts, chainId } = payload.params[0];
		Log.debug(`accounts: ${accounts}, chainId: ${chainId}`);
	});

	connector.on('disconnect', (error, payload) => {
		Log.debug(`Connector disconnected: ${payload}`);
		if (error) {
			throw error;
		}
		// Delete connector
	});
};

const signMessage = async (connector: WalletConnect, user: User, accounts: string) => {
	Log.debug('signMessage Called');
	const address = accounts[0];
	// Log.debug(connector);
	const message = `Discord Tag = ${user.tag}`;
	const msgParams = [
		convertUtf8ToHex(message),
		address,
	];
	Log.debug(msgParams);
	// Sign message
	try {
		Log.debug('Ask user to sign message.');
		const waitFor = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

		await waitFor(500);

		const result = await connector.signPersonalMessage(msgParams);
		const signingAddress = ethers.utils.verifyMessage(message, result);
		// Need to add a time out here and error message
		Log.debug(signingAddress);
        
		Log.debug(`Signed Message result: ${result}`);
		return signingAddress.toLowerCase === address.toLowerCase;
	} catch (e) {
		Log.error('Failed to sign message');
	}
};
