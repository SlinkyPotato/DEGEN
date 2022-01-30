import WalletConnect from '@walletconnect/client';
import { DMChannel, User, MessageAttachment } from 'discord.js';
import Canvas from 'canvas';
import QRCode from 'qrcode';
import Log from './Log';
import MongoDbUtils from '../utils/MongoDbUtils';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';
import constants from '../service/constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { convertUtf8ToHex } from '@walletconnect/utils';
import { ethers } from 'ethers';


export const v1WalletConnect = async (user: User, dmChannel: DMChannel):Promise<any> => {
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
		connector.createSession();
	}
	

	connector.on('display_uri', async (error, payload) => {
		if (error) {
			throw error;
		}
		uri = payload.params[0];
		
		const canvas = Canvas.createCanvas(244, 244);
		await QRCode.toCanvas(canvas, uri);
		const attachment = new MessageAttachment(canvas.toBuffer(), 'profile-image.png');
		try {
			if (dmChannel) {
				
				await dmChannel.send({ content: 'Scan the QR code with your mobile app to connect to DEGEN', files: [attachment] });
			}
		} catch (e) {
			return e;
		}
	});
	// Subscribe to connection events
	connector.on('connect', async (error, payload) => {
		if (error) {
			throw error;
		}
		// Get provided accounts and chainId
		const { accounts, chainId } = payload.params[0];
		try {
			// sign a message from the connected account
			const signedMessage = await signMessage(connector, user, accounts);
            
			Log.debug(signedMessage);
			if (signedMessage) {
				const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
				const userSettingsCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
				const result: UpdateWriteOpResult = await userSettingsCol.updateOne({
					userId: user.id.toString(),
				},
				{
					$set: { ethWalletSettings: { isPOAPDeliveryEnabled: true, publicAddress: accounts } },
				},
				);
				if (await result.result.ok) {
					await dmChannel.send({ content: `Connected ${user.tag} to Eth Public Address: ${accounts}` });
				}
			}
		}catch (e) {
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
		Log.debug(`payload: ${payload}`);
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
		Log.debug('ask user to sign message');
		const result = await connector.signPersonalMessage(msgParams);
		const signingAddress = ethers.utils.verifyMessage(message, result);
		Log.debug(signingAddress);
        
		Log.debug(`Signed Message result: ${result}`);
		return signingAddress.toLowerCase === address.toLowerCase;
	} catch (e) {
		Log.error('failed to sign message');
	}
};
