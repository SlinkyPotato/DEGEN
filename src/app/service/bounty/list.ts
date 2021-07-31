import { CommandContext } from 'slash-create';
import constants from '../../constants';
import { Cursor, Db } from 'mongodb';
import ServiceUtils from '../../utils/ServiceUtils';
import BountyUtils from '../../utils/BountyUtils';
import dbInstance from '../../utils/db';

const DB_RECORD_LIMIT = 10;

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const listType: string = ctx.options.list['list-type'];
	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

	await BountyUtils.validateBountyType(ctx, guildMember, listType);

	let dbRecords: Cursor;
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	let introStr: string;

	switch (listType) {
	case 'CREATED_BY_ME':
		introStr = `Showing max 10 bounties created by <@${ctx.user.id}>: \n\n`;
		dbRecords = dbCollection.find({ 'createdBy.discordId': ctx.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'CLAIMED_BY_ME':
		introStr = `Showing max 10 bounties claimed by <@${ctx.user.id}>: \n\n`;
		dbRecords = dbCollection.find({ 'claimedBy.discordId': ctx.user.id }).limit(DB_RECORD_LIMIT);
		break;
	case 'OPEN':
		introStr = 'Showing max 10 Open bounties: \n\n';
		dbRecords = dbCollection.find({ status: 'Open' }).limit(DB_RECORD_LIMIT);
		break;
	default:
		console.log('invalid list-type');
		return ctx.send(`<@${ctx.user.id}> Please use a valid list-type`);
	}
	if (!await dbRecords.hasNext()) {
		await dbInstance.close();
		return ctx.send(`<@${ctx.user.id}> We couldn't find any bounties!`);
	}

	const formattedBountiesReply = await formatRecords(dbRecords);
	await dbInstance.close();

	await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
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