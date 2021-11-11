import { GuildMember } from 'discord.js';
import { Db, Collection } from 'mongodb';
import constants from '../constants/constants';
import { Timecard } from '../../types/timecard.ts/Timecard';
import dayjs from 'dayjs';
import ValidationError from '../../errors/ValidationError';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, date: number): Promise<any> => {
	if (guildMember.user.id === null) {
		throw new ValidationError(`No guildMember <@${guildMember.id}>.`);
	}


	const timecard = {
		startTime: date,
		description: null,
		endTime: null,
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	};

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const timecardDb: Collection = await db.collection(constants.DB_COLLECTION_TIMECARDS);

	const activeTimecard: Timecard = await timecardDb.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});

	if (activeTimecard) {
		await guildMember.send('You already have an active timecard. Close out the active timecard with /timecard checkout then start a new one.');
		return 'already checked in';
	}

	const dbCheckin = await timecardDb.insertOne(timecard);
	await guildMember.send(`Timecard started at ${dayjs(date).format()}`);
	return dbCheckin;
};

