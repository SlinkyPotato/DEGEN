import MongoDbUtils from '../../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import constants from '../../constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log, { LogUtils } from '../../../utils/Log';


export const updatePOAPDAddress = async (user: User, address: string): Promise<string> => {
	Log.debug('start updatePOAPAddress');

	try {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		const result1: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$pull: {
				'connectedAddresses': address,
			},
		});
		const result2: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{	$push:
			{ 'connectedAddresses': {
				$each: [address],
				$position: 0,
			},
			},
		},
		);
		if (result1.modifiedCount === 1 && result2.modifiedCount === 1) {
			Log.debug('User connectedAddresses succesfully updated');
			return `Your new POAP delivery address is: ${address}`;
		} if (result1.modifiedCount === 0 && result1.matchedCount === 1) {
			Log.debug('User selected the current active address');
			return `Your POAP address is still: ${address}`;
		}else {
			LogUtils.logError(`Error on updatePOAPAddress ${result1}`, result1);
			return 'Sorry, we had an issue updating your POAPAddress.';
		}
	} catch (e) {
		LogUtils.logError(`Error on updatePOAPAddress ${e}`, e);
		return 'There was an error updating your POAP delivery address.';
	}
};