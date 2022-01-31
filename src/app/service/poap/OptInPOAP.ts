import {
	Collection,
	Db,
	InsertOneWriteOpResult,
} from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import Log, { LogUtils } from '../../utils/Log';
import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	User,
} from 'discord.js';
import buttonIds from '../constants/buttonIds';
import { v1WalletConnect } from '../../utils/v1WalletConnect';

const OptInPOAP = async (user: User, dmChannel: DMChannel): Promise<void> => {
	Log.debug('starting opt-in check for user');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const userSettingsCol: Collection<DiscordUserCollection> = await db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	
	Log.debug('looking for user in DB');
	const userSettings: DiscordUserCollection | null = await userSettingsCol.findOne({
		userId: user.id.toString(),
	});
	
	await dmChannel.sendTyping();
	Log.debug(userSettings);
	if (userSettings == null) {
		Log.debug('user settings not found');
		try {
			Log.debug('adding new user to DiscordUserCollection');
			const result: InsertOneWriteOpResult<DiscordUserCollection> = await userSettingsCol.insertOne({
				userId: user.id.toString(),
				tag: user.tag,
			} as DiscordUserCollection);
			if (result == null || result.result.ok != 1) {
				throw new Error('failed to insert user settings');
			}
		} catch (e) {
			LogUtils.logError('Failed trying to add user to DiscordUserCollection', e);
			throw e;
		}
	}
	
	if (!userSettings?.walletSettings) {
		Log.debug('DiscordUser.walletSettings does not exist. Ask user to connect their wallet.');
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
	if (userSettings?.walletSettings) {

	} 
	else {
		Log.debug(`user is opted in to dms, userId: ${user.id}`);
		await dmChannel.send({ content: 'I will send you POAPs as soon as I get them!' }).catch(e => {
			LogUtils.logError('failed to send opt-in confirmation', e);
		});
	}
};


export default OptInPOAP;