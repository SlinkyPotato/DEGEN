import { CommandContext } from 'slash-create';
import constants from '../../constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import ServiceUtils from '../../utils/ServiceUtils';
import dbInstance from '../../utils/db';

const BOUNTY_BOARD_URL = 'https://bankless.community';

export const deleteBounty = async (ctx: CommandContext, bountyId: string): Promise<any> => {
	
	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	// const createdBy = dbBountyResult.createdBy.id

	if (dbBountyResult == null) {
		console.log(`${bountyId} bounty not found in db`);
		return ctx.send(`Sorry <@${ctx.user.id}>, we're not able to find that bounty with ID \`${bountyId}\`.`);
	}

	if (dbBountyResult.status === 'Deleted') {
		console.log(`${bountyId} bounty already deleted`);
		return ctx.send(`<@${ctx.user.id}> looks like bounty \`${bountyId}\` is already deleted!`);
	}

	if (ServiceUtils.isUserAdmin(guildMember)) {
		return ctx.send('testing');
	}

	if (dbBountyResult.status != 'Draft') {
		console.log(`${bountyId} bounty is not open`);
		return ctx.send(`Sorry bounty \`${bountyId}\` is not Open.`);
	}

	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			deletedBy: {
				'discordHandle': ctx.user.username,
				'discordId': ctx.user.id,
			},
			status: 'Deleted',
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} with claimed user  <@${ctx.user.id}>`);
		return ctx.send('Sorry something is not working, our devs are looking into it.');
	}

	await dbInstance.close();
	return ctx.send(`Bounty is now claimed by <@${ctx.user.id}>! Please sign the bounty to begin work at ${BOUNTY_BOARD_URL}/${bountyId}`);
};
