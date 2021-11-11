import constants from '../constants/constants';
import { Cursor, Db } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import { GuildMember, MessageEmbedOptions } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { generateEmbedMessage } from './create/PublishBounty';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

const DB_RECORD_LIMIT = 10;

export default async (guildMember: GuildMember, listType: string): Promise<any> => {
	await BountyUtils.validateBountyType(guildMember, listType);

	let dbRecords: Cursor;
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	switch (listType) {
	case 'CREATED_BY_ME':
		dbRecords = dbCollection.find({ 'createdBy.discordId': guildMember.user.id, status: { $ne: 'Deleted' } }).limit(DB_RECORD_LIMIT);
		break;
	case 'CLAIMED_BY_ME':
		dbRecords = dbCollection.find({ 'claimedBy.discordId': guildMember.user.id, status: { $ne: 'Deleted' } }).limit(DB_RECORD_LIMIT);
		break;
	case 'DRAFT_BY_ME':
		dbRecords = dbCollection.find({ 'createdBy.discordId': guildMember.user.id, status: 'Draft' }).limit(DB_RECORD_LIMIT);
		break;
	case 'OPEN':
		dbRecords = dbCollection.find({ status: 'Open' }).limit(DB_RECORD_LIMIT);
		break;
	case 'IN_PROGRESS':
		dbRecords = dbCollection.find({ status: 'In-Progress' }).limit(DB_RECORD_LIMIT);
		break;
	default:
		Log.info('invalid list-type');
		return guildMember.send({ content: 'Please use a valid list-type' });
	}
	if (!await dbRecords.hasNext()) {
		return guildMember.send({ content: 'We couldn\'t find any bounties!' });
	}
	return sendMultipleMessages(guildMember, dbRecords);
};

const sendMultipleMessages = async (guildMember: GuildMember, dbRecords: Cursor): Promise<any> => {
	const listOfBounties = [];
	while (listOfBounties.length < 10 && await dbRecords.hasNext()) {
		const record: BountyCollection = await dbRecords.next();
		const messageOptions: MessageEmbedOptions = generateEmbedMessage(record, record.status);
		listOfBounties.push(messageOptions);
	}
	await (guildMember.send({ embeds: listOfBounties }));
	await guildMember.send({ content: 'Please go to #🧀-bounty-board to take action.' });
};