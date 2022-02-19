import WalletConnect from '@walletconnect/client';
import { DMChannel, User, MessageAttachment } from 'discord.js';
import Canvas from 'canvas';
import QRCode from 'qrcode';
import Log, { LogUtils } from '../../utils/Log';

import { convertUtf8ToHex } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { addUserAddress } from './mongoDbOperations/addUserAddress';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';

export const v1WalletConnect = async (user: User, dmChannel: DMChannel, discordUserDocument: DiscordUserCollection):Promise<any> => {
	Log.debug('starting v1 WalletConnect');
	const connector = new WalletConnect({
		bridge: 'https://bridge.walletconnect.org',
		clientMeta: {
			name: 'DEGEN',
			description: 'POAPs directly to your wallet',
			url: 'https://degen.bankless.community',
			icons: ['does not exist yet'],
		},
	});

	if (!connector.connected) {
		Log.debug('WalletConnect connector does not exist.');
		await connector.createSession();
		
		const canvas = Canvas.createCanvas(244, 244);
		await QRCode.toCanvas(canvas, connector.uri);
		const attachment = new MessageAttachment(canvas.toBuffer(), 'qr-code.png');
		try {
			if (dmChannel) {
				Log.debug('Sending WC QR code');
				await dmChannel.send({ content: 'Scan the QR code with your mobile app connect to DEGEN, and sign the message to verify you own the address to connect to DEGEN.', files: [attachment] });
			}
		
		} catch (e) {
			LogUtils.logError('Error sending WC QR code', e);
			return e;
		}
		
	}
	
	connector.on('connect', async (error, payload) => {
		if (error) {
			LogUtils.logError('Error on WC connect', error);
			throw error;
		}
		Log.debug(`WalletConnect connected ${payload.params[0].accounts}`);
		const { accounts }: {accounts: string[0]} = payload.params[0];
		const addressToConnect: string = accounts[0];
		Log.debug(`${addressToConnect}`);
		try {
			if (discordUserDocument.connectedAddresses) {
				const addressAlreaadyConected: boolean = discordUserDocument.connectedAddresses.some(item => addressToConnect === item);
				if (addressAlreaadyConected) {
					Log.debug('Address is already connected');
					return await dmChannel.send(`Address: ${accounts[0]} is already connected`);
				}
			}
			Log.debug('Address not yet connected.');
			Log.debug('Sending user sign message prompt.');
			await dmChannel.send('Please sign the message from your wallet. If the sign message prompt does not appear in your wallet, please try again by sending me a <gm>.');
			const signedMessage = await signMessage(connector, user, accounts);
			if (signedMessage) {
				Log.debug('User sucessfully signed message. Adding connection to DB.');
				const result = await addUserAddress(user, addressToConnect);
				if (result) {
					Log.debug('Send user connection confirmation');
					await dmChannel.send({ content: `Connected ${user.tag} to: ${accounts}` });
				}
			} else {
				Log.debug('signMessage returned false');
			}
			
		} catch (e) {
			LogUtils.logError('Error on WalletConnect', e);
			return e;
		}
	});

	connector.on('session_update', (error, payload) => {
		if (error) {
			throw error;
		}
		const { accounts, chainId } = payload.params[0];
		Log.debug(`accounts: ${accounts}, chainId: ${chainId}`);
	});

	connector.on('disconnect', (error, payload) => {
		Log.debug(`Connector disconnected: ${payload}`);
		if (error) {
			throw error;
		}
	});
};

const signMessage = async (connector: WalletConnect, user: User, accounts: string) => {
	Log.debug('signMessage Called');
	const address = accounts[0];
	const message = `Discord Tag = ${user.tag}`;
	const msgParams = [
		convertUtf8ToHex(message),
		address,
	];

	try {
		Log.debug('Ask user to sign message.');
		const waitFor = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));

		await waitFor(500);

		const result = await connector.signPersonalMessage(msgParams);
		const signingAddress = ethers.utils.verifyMessage(message, result);
        
		Log.debug(`Signed Message result: ${result}`);
		return signingAddress.toLowerCase === address.toLowerCase;
	} catch (e) {
		LogUtils.logError('Failed to sign message', e);
	}
};