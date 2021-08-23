import { GuildMember } from 'discord.js';
import { Collection, Db, InsertOneWriteOpResult, MongoError } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { POAPSettings } from '../../types/poap/POAPSettings';
import ValidationError from '../../errors/ValidationError';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		event: event,
	});
	console.log('settings found');
	if (poapSettingsDoc == null) {
		console.log(`setting up first time poap configuration for ${guildMember.user.tag}`);
		await setupPoapSetting(guildMember, poapSettingsDB, event);
		await clearPOAPParticipants(db, event);
		return dbInstance.close();
	} else if (poapSettingsDoc.isActive) {
		console.log('unable to start due to active event');
		throw new ValidationError(`Sorry, ${event} is active. Please try \`/poap end\`.`);
	}
	
	await clearPOAPParticipants(db, event);
	const currentDateStr = (new Date()).toISOString();
	console.log(currentDateStr);
	if (!poapSettingsDoc.isActive) {
		await poapSettingsDB.updateOne({
			event: event,
		}, {
			$set: {
				isActive: true,
				startTime: currentDateStr,
			},
		});
	}
	await guildMember.send({ content: `POAP tracking started for ${event}! Use \`/poap end\` to end event and retrieve list of participants` });
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

export const clearPOAPParticipants = async (db: Db, event: string): Promise<void> => {
	console.log(`attempting to delete all previous participants for event: ${event}...`);
	const poapParticipantsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	await poapParticipantsDB.deleteMany({
		event: event,
	});
	console.log('removed all previous participants.');
};
