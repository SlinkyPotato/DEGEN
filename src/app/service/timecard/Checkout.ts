import { GuildMember } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../constants/constants';
import { Timecard } from '../../types/timecard.ts/Timecard';
import ValidationError from '../../errors/ValidationError';
import Log from '../../utils/Log';


import dayjs from 'dayjs';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, date: number, description: string): Promise<any> => {

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const timecardDb: Collection = db.collection(constants.DB_COLLECTION_TIMECARDS);

	const activeTimecard: Timecard = await timecardDb.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeTimecard == null) {
		throw new ValidationError(`No active event found for <@${guildMember.id}>.`);
	}
	
	const sTime = dayjs(activeTimecard.startTime);
	const eTime = dayjs(date);
	
	const duration = eTime.diff(sTime, 'minutes');
	
	// validation tests?

	
	const updateTimecardResult: UpdateWriteOpResult = await timecardDb.updateOne(activeTimecard, {
		$set: {
			isActive: false,
			endTime: date,
			duration: duration,
			description: description,
		},
	});

	if (updateTimecardResult.modifiedCount !== 1) {
		throw new ValidationError('Event is not active.');
	}
	
	Log.info('timecard ended', {
		indexMeta: true,
		meta: {
			discordId: activeTimecard.discordServerId,
			duration: duration,
			isActive: false,
			description: description,
		},
	});
	
	await guildMember.send(`Timecard finished at ${dayjs(date).format()}`);
	return updateTimecardResult;
};
