import { CommandContext } from 'slash-create';
import db from '../../db/db';
import constants from '../../constants';
import mongo, { MongoError, UpdateWriteOpResult } from 'mongodb';
import bountyUtils from './BountyUtils';
import serviceUtils from '../ServiceUtils';

const BOUNTY_BOARD_URL = 'https://bankless.community';

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const guildMember = await serviceUtils.getGuildMember(ctx);
	const { isBountyIdValid, bountyId } = bountyUtils.validateBountyId(ctx.options.claim['bounty-id']);
	if (!isBountyIdValid) {
		await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		return guildMember.send(`<@${ctx.user.id}>\n` +
			'Please enter a valid bounty hash ID: \n' +
			' - can be found on bountyboard website\n' +
			` - ${constants.BOUNTY_BOARD_URL}`);
	}

	return await db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError): Promise<any> => {
		if (error) {
			console.log('ERROR', error);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}

		const dbCollection = db.get().collection(constants.DB_COLLECTION_BOUNTIES);
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
					'discordHandle': ctx.user.username,
					'discordId': ctx.user.id,
				},
				claimedAt: Date.now(),
			},
		});

		if (writeResult.modifiedCount != 1) {
			console.log(`failed to update record ${bountyId} with claimed user  <@${ctx.user.id}>`);
			return ctx.send('Sorry something is not working, our devs are looking into it.');
		}

		await db.close();
		return ctx.send(`Bounty is now claimed by <@${ctx.user.id}>! Please sign the bounty to begin work at ${BOUNTY_BOARD_URL}/${bountyId}`);
	});
};
