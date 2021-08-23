import { GuildMember } from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';

export default async (guildMember: GuildMember, occasion: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		occasion: occasion,
	});
	
	if (poapSettingsDoc == null) {
		console.log(`setting up first time poap configuration for ${guildMember.user.tag}`);
		await setupPoapSetting(guildMember, poapSettingsDB, occasion);
	} else if (poapSettingsDoc.isActive) {
		console.log('unable to start due to active occasion');
		throw new ValidationError(`Sorry, ${occasion} active. Please try /poap end`);
	}
	
	console.log(`attempting to delete all previous participants for occasion: ${occasion}`);
	const poapParticipantsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	await poapParticipantsDB.deleteMany({
		event: occasion,
	});
	return dbInstance.close();
};

export const setupPoapSetting = async (guildMember: GuildMember, poapSettingsDB: Collection, occasion: string): Promise<POAPSettings> => {
	const currentDateStr = (new Date()).toISOString();
	const result: InsertOneWriteOpResult<POAPSettings> = await poapSettingsDB.insertOne({
		event: occasion,
		isActive: true,
		startTime: currentDateStr,
		poapManagerId: guildMember.user.id,
		poapManagerTag: guildMember.user.tag,
	});
	if (result == null || result.insertedCount !== 1) {
		throw new MongoError('failed to insert poapSettings');
	}
	return result.ops.pop();
};
