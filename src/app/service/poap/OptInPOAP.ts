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
	MessageEmbed,
	User,
} from 'discord.js';
import { sendMessageWithInteractions } from '../../utils/sendMessageWithInteraction';
import { connectNewAccount } from '../../utils/interactions/connectNewAccount';
import { updateUserAddresses } from '../../utils/interactions/updateUserAddresses';
import { createConnectedAddressEmbed } from '../../utils/createConnectedAddressEmbed';

const OptInPOAP = async (user: User, dmChannel: DMChannel): Promise<void> => {
	Log.debug('starting opt-in check for user');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const userSettingsCol: Collection<DiscordUserCollection> = await db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	
	Log.debug('looking for user in DB');
	const discordUserDocument: DiscordUserCollection | null = await userSettingsCol.findOne({
		userId: user.id.toString(),
	});

	await dmChannel.sendTyping();
	Log.debug(discordUserDocument);
	if (discordUserDocument == null) {
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

	// User has not connected an address
	if (!discordUserDocument?.connectedAddresses) {
		Log.debug('DiscordUser.walletSettings does not exist. Ask user to connect their wallet.');
		try{
			await sendMessageWithInteractions(
				connectNewAccount,
				dmChannel,
				user,
				null);
			// Do you want to give this account a nickname?
		} catch (e) {
			LogUtils.logError('OptInPOAP.ts error after connectNewAccount interaction', e);
		}
	}

	// User has connected an address
	if (discordUserDocument?.connectedAddresses) {
		// show user their connected Addresses
		Log.debug('DiscordUser has a connectedAddress. Ask user to connect new, change live, or delete an address.');
		try{
			const embeds: MessageEmbed = createConnectedAddressEmbed(user, discordUserDocument);
			await dmChannel.send({ embeds: [embeds] });
			await sendMessageWithInteractions(
				updateUserAddresses,
				dmChannel,
				user,
				discordUserDocument);
		} catch (e) {
			LogUtils.logError('OptInPOAP.ts error after updateUserAddresses interaction', e);
		}
		Log.debug('user settings update skipped');
	} else {
		Log.debug(`user is opted in to dms, userId: ${user.id}`);
		await dmChannel.send({ content: 'I will send you POAPs as soon as I get them!' }).catch(e => {
			LogUtils.logError('failed to send opt-in confirmation', e);
		});
	}
	
};


export default OptInPOAP;