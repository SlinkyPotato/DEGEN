import constants from '../constants/constants';
import { Cursor, Db } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import dbInstance from '../../utils/db';
import { GuildMember } from 'discord.js';

const DB_RECORD_LIMIT = 10;

export default async (guildMember: GuildMember, listType: string): Promise<any> => {
	await BountyUtils.validateBountyType(guildMember, listType);

	let dbRecords: Cursor;
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	let introStr: string;

	switch (listType) {
	case 'CREATED_BY_ME':
		introStr = `Showing max 10 bounties created by <@${guildMember.user.tag}>: \n\n`;
		dbRecords = dbCollection.find({ 'createdBy.discordId': guildMember.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'CLAIMED_BY_ME':
		introStr = `Showing max 10 bounties claimed by <@${guildMember.user.tag}>: \n\n`;
		dbRecords = dbCollection.find({ 'claimedBy.discordId': guildMember.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'OPEN':
		introStr = 'Showing max 10 Open bounties: \n\n';
		dbRecords = dbCollection.find({ status: 'Open' }).limit(DB_RECORD_LIMIT);
		break;
	case 'IN_PROGRESS':
		introStr = 'Showing max 10 In-Progress bounties: \n\n';
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

	const formattedBountiesReply = await formatRecords(dbRecords);
	await dbInstance.close();
	
	return guildMember.send(introStr + formattedBountiesReply);
};

const formatRecords = async (dbRecords: Cursor): Promise<any> => {
	let bountyListStr = '';

	while (await dbRecords.hasNext()) {
		const record = await dbRecords.next();
		bountyListStr += `**bountyId**: ${record._id} | **summary**: ${record.description} | **reward**: ${record.reward.amount} ${record.reward.currency} \n`;
	}

	return bountyListStr;
};