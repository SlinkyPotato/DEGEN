import MongoDbUtils from '../../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import constants from '../../constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log, { LogUtils } from '../../../utils/Log';

export const deleteUserAddress = async (user: User, address: string): Promise<string> => {
	Log.debug('start deleteUserAddress');
	Log.debug(`${address}`);
	try {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		// find user, if the address doesn't exist add it to their account
		const result: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$pull: { 'connectedAddresses':
				address,
			},
		},
		);
		if (result.modifiedCount === 1) {
			return `Address ${address} has been removed from my DB.`;
		} else {
			LogUtils.logError(`Error on deleteUserAddress ${result}`, result);
			return 'Sorry, we had an issue deleting your address.';
		}
	} catch (e) {
		LogUtils.logError(`Error on updatePOAPAddress ${e}`, e);
		return 'There was an error deleting your address.';
	}
};