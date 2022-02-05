import MongoDbUtils from '../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import constants from '../../service/constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log, { LogUtils } from '../Log';

export const deleteUserAddress = async (user: User, chainIdAndAddress: string): Promise<string> => {
	Log.debug('start deleteUserAddress');
	Log.debug(chainIdAndAddress);
	const chainId: string = chainIdAndAddress.substring(chainIdAndAddress.indexOf(':') + 2, chainIdAndAddress.indexOf(','));
	Log.debug(`chainID: /${chainId}/`);
	const addressStr: string = chainIdAndAddress.substring(chainIdAndAddress.lastIndexOf(':') + 2);
	Log.debug(`addressToDelete: /${addressStr}/`);

	try {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		// find user, if the address doesn't exist add it to their account
		const result: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$pull: { 'connectedAddresses': {
				address: addressStr,
				chainId: chainId,
			},
			},
		});
		if (result.modifiedCount === 1) {
			return `Address ${addressStr} from ChainId: ${chainId} has been removed from my DB.`;
		} else {
			LogUtils.logError(`Error on deleteUserAddress ${result}`, result);
			return 'Sorry, we had an issue deleting your address.';
		}
	} catch (e) {
		LogUtils.logError(`Error on updatePOAPAddress ${e}`, e);
		return 'There was an error deleting your address.';
	}
};