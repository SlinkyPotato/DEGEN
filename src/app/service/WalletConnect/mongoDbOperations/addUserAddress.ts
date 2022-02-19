import MongoDbUtils from '../../../utils/MongoDbUtils';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import constants from '../../constants/constants';
import { Db, Collection, UpdateWriteOpResult } from 'mongodb';
import { User } from 'discord.js';
import Log from '../../../utils/Log';

export const addUserAddress = async (user: User, addressToConnect: string): Promise<boolean> => {
	Log.debug('addUserAddress called');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordUserCol: Collection<DiscordUserCollection> = db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	try {
		const result: UpdateWriteOpResult = await discordUserCol.updateOne({
			userId: user.id.toString(),
		},
		{
			$push: { 'connectedAddresses': {
				$each: [addressToConnect],
				$position: 0,
			},
			},
		});
		return !!result.result.ok;
	} catch (e) {
		Log.debug(`addUserAddressError: ${e}`);
		throw e;
	}
};