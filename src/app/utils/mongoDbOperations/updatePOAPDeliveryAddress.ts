import MongoDbUtils from '../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import constants from '../../service/constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log, { LogUtils } from '../Log';

// Need validation on whether or not the address is in the DB.
// Also does not cover multichain
export const updatePOAPDAddress = async (user: User, chainIdAndAddress: string): Promise<string> => {
	Log.debug('start updatePOAPAddress');
	Log.debug(chainIdAndAddress);
	// chainId is first character after the :
	// address is everything after the second :

	const chainId = chainIdAndAddress.substring(chainIdAndAddress.indexOf(':') + 2, chainIdAndAddress.indexOf(','));
	Log.debug(`chainID: ${chainId}`);
	const newPOAPAddress = chainIdAndAddress.substring(chainIdAndAddress.lastIndexOf(':') + 2);
	Log.debug(`newPOAPAddress: ${newPOAPAddress}`);
	

	// 
	try {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		// find user, if the address doesn't exist add it to their account
		const result: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$set: { 'POAPAddress':
            newPOAPAddress },
		});
		if (result.modifiedCount === 1) {
			return `Your new POAP delivery address is ${newPOAPAddress}`;
		} if (result.modifiedCount === 0 && result.matchedCount === 1) {
			return `Your POAP address is still ${newPOAPAddress}`;
		}else {
			LogUtils.logError(`Error on updatePOAPAddress ${result}`, result);
			return 'Sorry, we had an issue updating your POAPAddress.';
		}
	} catch (e) {
		LogUtils.logError(`Error on updatePOAPAddress ${e}`, e);
		return 'There was an error updating your POAP delivery address.';
	}
};