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
import { connectNewAccount } from '../WalletConnect/interactions/ButtonInteractions/connectNewAccount';
import { updateUserAddresses } from '../WalletConnect/interactions/ButtonInteractions/updateUserAddresses';
import { createConnectedAddressEmbed } from '../WalletConnect/createConnectedAddressEmbed';

export const ConnectAddress = async (user: User, dmChannel: DMChannel): Promise<void> => {
	Log.debug('starting opt-in check for user');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const userSettingsCol: Collection<DiscordUserCollection> = await db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	
	Log.debug('Looking for user in DB');
	let discordUserDocument: DiscordUserCollection | null = await userSettingsCol.findOne({
		userId: user.id.toString(),
	});

	await dmChannel.sendTyping();
	if (discordUserDocument == null) {
		Log.debug('User not found');
		try {
			Log.debug('Adding new user to DiscordUserCollection');
			const result: InsertOneWriteOpResult<DiscordUserCollection> = await userSettingsCol.insertOne({
				userId: user.id.toString(),
				tag: user.tag,
			} as DiscordUserCollection);
			discordUserDocument = await userSettingsCol.findOne({
				userId: user.id.toString(),
			});
			if (result == null || result.result.ok != 1) {
				Log.debug('Failed to insert new user');
				throw new Error('failed to insert user settings');
			}
			Log.debug('Successfully added new user');
		} catch (e) {
			LogUtils.logError('Failed trying to add user to DiscordUserCollection', e);
			throw e;
		}
	}
	Log.debug('DiscordUser document Exists');
	if (discordUserDocument && !discordUserDocument?.connectedAddresses || discordUserDocument?.connectedAddresses.length === 0) {
		Log.debug('Discord user has no connected addresses. Ask user to connect their wallet.');
		try{
			await connectNewAccount(
				user,
				dmChannel,
				discordUserDocument,
			);
		} catch (e) {
			LogUtils.logError('OptInPOAP.ts error after connectNewAccount interaction', e);
		}
	} else if (discordUserDocument?.connectedAddresses) {
		// show user their connected Addresses
		Log.debug('DiscordUser has a connectedAddress. Ask user to connect new, change live, or delete an address.');
		try{
			const embeds: MessageEmbed = createConnectedAddressEmbed(user, discordUserDocument);
			await dmChannel.send({ embeds: [embeds] });
			await updateUserAddresses(
				user,
				dmChannel,
				discordUserDocument,
			);
		} catch (e) {
			LogUtils.logError('OptInPOAP.ts error after updateUserAddresses interaction', e);
		}
		Log.debug('user settings update skipped');
		
	
	}
};