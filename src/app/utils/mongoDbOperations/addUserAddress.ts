import MongoDbUtils from '../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import constants from '../../service/constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import { ConnectedAddress } from '../../types/discord/ConnectedAddress';
import Log from '../Log';

// option to update new address to POAPDelivery

export const addUserAddress = async (user: User, addressToConnect: ConnectedAddress): Promise<boolean> => {
	Log.debug('addUserAddress called');
	Log.debug(typeof addressToConnect.chainId);
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	// find user, if the address doesn't exist add it to their account
	try {
		const result: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$push: { 'connectedAddresses': addressToConnect },
			$set:{ 'POAPAddress': addressToConnect.address },
		});
		return !!result.result.ok;
	} catch (e) {
		Log.debug(`addUserAddressError: ${e}`);
		throw e;
	}
};