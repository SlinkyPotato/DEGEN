import MongoDbUtils from '../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import constants from '../../service/constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log, { LogUtils } from '../Log';
import { ConnectedAddress } from '../../types/discord/ConnectedAddress';
import { getChain } from 'evm-chains';


export const updatePOAPDAddress = async (user: User, chainIdAndAddress: string): Promise<string> => {
	Log.debug('start updatePOAPAddress');

	const chainId = chainIdAndAddress.substring(chainIdAndAddress.indexOf(':') + 2, chainIdAndAddress.indexOf(','));
	const addressStr = chainIdAndAddress.substring(chainIdAndAddress.lastIndexOf(':') + 2);
	
	const updateAddress: ConnectedAddress = {
		address: addressStr,
		chainId: chainId,
	};
	
	try {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		const result1: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$pull: {
				'connectedAddresses': updateAddress,
			},
		});
		const result2: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{	$push: { 'connectedAddresses': {
			$each: [updateAddress],
			$position: 0,
		},
		},
		},
		);
		if (result1.modifiedCount === 1 && result2.modifiedCount === 1) {
			// do the chainId thing here
			return `Your new POAP delivery address is ${getChain(parseInt(chainId)).name}: ${addressStr}`;
		} if (result1.modifiedCount === 0 && result1.matchedCount === 1) {
			return `Your POAP address is still ${getChain(parseInt(chainId)).name}: ${addressStr}`;
		}else {
			LogUtils.logError(`Error on updatePOAPAddress ${result1}`, result1);
			return 'Sorry, we had an issue updating your POAPAddress.';
		}
	} catch (e) {
		LogUtils.logError(`Error on updatePOAPAddress ${e}`, e);
		return 'There was an error updating your POAP delivery address.';
	}
};