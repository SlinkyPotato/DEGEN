import { CommandContext } from 'slash-create';
import constants from '../../constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import ServiceUtils from '../../utils/ServiceUtils';
import dbInstance from '../../utils/db';

const BOUNTY_BOARD_URL = 'https://bankless.community';

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const bountyId = ctx.options.claim['bounty-id'];
	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
	await BountyUtils.validateBountyId(ctx, guildMember, bountyId);

	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'Open',
	});

	if (dbBountyResult == null) {
		console.log(`${bountyId} bounty not found in db`);
		return ctx.send(`Sorry <@${ctx.user.id}>, we're not able to find an open bounty with ID \`${bountyId}\`.`);
	}

	if (dbBountyResult.claimedBy && dbBountyResult.status != 'Open') {
		console.log(`${bountyId} bounty already claimed by ${dbBountyResult.claimedBy.discordHandle}`);
		return ctx.send(`Sorry <@${ctx.user.id}>, bounty \`${bountyId}\` already claimed.`);
	}

	if (dbBountyResult.status != 'Open') {
		console.log(`${bountyId} bounty is not open`);
		return ctx.send(`Sorry bounty \`${bountyId}\` is not Open.`);
	}

	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			claimedBy: {
				'discordHandle': ctx.user.username + '#' + ctx.user.discriminator,
				'discordId': ctx.user.id,
			},
			claimedAt: Date.now(),
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} with claimed user  <@${ctx.user.id}>`);
		return ctx.send('Sorry something is not working, our devs are looking into it.');
	}

	await dbInstance.close();
	return ctx.send(`Bounty is now claimed by <@${ctx.user.id}>! Please sign the bounty to begin work at ${BOUNTY_BOARD_URL}/${bountyId}`);
	
};
