import { GuildMember, MessageEmbedOptions } from 'discord.js';
import { Collection, Db, Cursor } from 'mongodb';
import constants from '../constants/constants';
import { Timecard } from '../../types/timecard.ts/Timecard';
import Log from '../../utils/Log';
import { generateEmbedMessage } from './publishTimecards/publishTimecards';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember): Promise<any> => {

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const timecardDb: Collection = db.collection(constants.DB_COLLECTION_TIMECARDS);

	const completedTimeCards = await timecardDb.find({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: false,
	});
	
	const numberOfTimeCards: number = await completedTimeCards.count();
	
	if (numberOfTimeCards === 0) {
		guildMember.send('No timecards found');
		return 'No timecards found';
	}
	
	const listOfTimeCards = await sendMultipleMessages(guildMember, completedTimeCards);
	
	
	Log.info('Hours Requestsed', {
		indexMeta: true,
		meta: {
			HoursReturned: 'completedTimeCards',
		},
	});
	return listOfTimeCards;
};
const sendMultipleMessages = async (guildMember: GuildMember, dbRecords: Cursor): Promise<any> => {
	const listOfTimecards = [];
	while (listOfTimecards.length < 10 && await dbRecords.hasNext()) {
		const record: Timecard = await dbRecords.next();
		const messageOptions: MessageEmbedOptions = generateEmbedMessage(record);
		listOfTimecards.push(messageOptions);
	}
	await (guildMember.send({ embeds: listOfTimecards }));
	return listOfTimecards;
};

