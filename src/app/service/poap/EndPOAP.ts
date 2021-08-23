import { GuildMember } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne({
		event: event,
		poapManagerId: guildMember.user.id,
	}, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError(`Sorry ${event} is not active. Please try /poap start.`);
	}
	console.log(`event ${event} ended`);
	
	return dbInstance.close();
};