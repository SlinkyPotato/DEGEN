import { CommandContext } from 'slash-create';
import constants from '../../constants';
import { Cursor, MongoError } from 'mongodb';
import db from '../../db/db';

const DB_RECORD_LIMIT = 10;

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const listType: string = ctx.options.list['list-type'];

	db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError) => {
		if (error) {
			console.log('Error', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}
		let dbRecords: Cursor;
		const dbCollection = await db.get().collection(constants.DB_COLLECTION_BOUNTIES);

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
			return ctx.send('please use a valid list-type');
		}
		const formattedBountiesReply = await module.exports.formatRecords(dbRecords);

		await db.close();

		return ctx.send(introStr + formattedBountiesReply);
	});
};

module.exports.formatRecords = async (dbRecords: Cursor): Promise<any> => {
	let bountyListStr = '';

	while (await dbRecords.hasNext()) {
		const record = await dbRecords.next();
		bountyListStr += `**bountyId**: ${record._id} | **summary**: ${record.description} | **reward**: ${record.reward.amount} ${record.reward.currency} \n`;
	}

	return bountyListStr;
};