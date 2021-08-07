import constants from '../constants/constants';
import { Cursor, Db } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import dbInstance from '../../utils/db';
import { GuildMember, MessageOptions } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { generateEmbedMessage } from './create/PublishBounty';

const DB_RECORD_LIMIT = 10;

export default async (guildMember: GuildMember, listType: string): Promise<any> => {
	await BountyUtils.validateBountyType(guildMember, listType);

	let dbRecords: Cursor;
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	switch (listType) {
	case 'CREATED_BY_ME':
		dbRecords = dbCollection.find({ 'createdBy.discordId': guildMember.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'CLAIMED_BY_ME':
		dbRecords = dbCollection.find({ 'claimedBy.discordId': guildMember.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'OPEN':
		dbRecords = dbCollection.find({ status: 'Open' }).limit(DB_RECORD_LIMIT);
		break;
	case 'IN_PROGRESS':
		dbRecords = dbCollection.find({ status: 'In-Progress', 'claimedBy.discordId': guildMember.user.id }).limit(DB_RECORD_LIMIT);
		break;
	default:
		console.log('invalid list-type');
		return guildMember.send(`<@${guildMember.user.id}> Please use a valid list-type`);
	}
	if (!await dbRecords.hasNext()) {
		await dbInstance.close();
		return guildMember.send(`<@${guildMember.user.id}> We couldn't find any bounties!`);
	}
	await sendMultipleMessages(guildMember, dbRecords);
	await dbInstance.close();
};

const sendMultipleMessages = async (guildMember: GuildMember, dbRecords: Cursor): Promise<any> => {

	while (await dbRecords.hasNext()) {
		const record: BountyCollection = await dbRecords.next();
		const messageOptions: MessageOptions = generateEmbedMessage(record);
		await (guildMember.send(messageOptions));
	}
	await guildMember.send(`<@${guildMember.user.id}> Please checkout the bounty in the #🧀-bounty-board to take action`);
};