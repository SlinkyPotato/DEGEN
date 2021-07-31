import { CommandContext } from 'slash-create';
import constants from '../../../constants';
import mongo, { MongoError, UpdateWriteOpResult } from 'mongodb';
import db from '../../../utils/db';
import BountyUtils from '../../../utils/BountyUtils';
import ServiceUtils from '../../../utils/ServiceUtils';

export default async (ctx: CommandContext): Promise<any> => {
	if (ctx.user.bot) return;

	const bountyId = ctx.options.create.validate['bounty-id'];
	const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

	await BountyUtils.validateBountyId(ctx, guildMember, bountyId);

	return db.connect(constants.DB_NAME_BOUNTY_BOARD, async (error: MongoError): Promise<any> => {
		if (error) {
			console.log('ERROR', error);
			return ctx.send(`<@${ctx.user.id}>Sorry something is not working, our devs are looking into it.`);
		}

		const dbCollection = db.get().collection(constants.DB_COLLECTION_BOUNTIES);
		const dbBountyResult = await dbCollection.findOne({
			_id: new mongo.ObjectId(bountyId),
			isDiscordBotGenerated: false,
			status: 'Draft',
		});

		if (dbBountyResult == null) {
			console.log(`${bountyId} bounty not found in db`);
			await ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			return guildMember.send(`<@${ctx.user.id}> Sorry we're not able to find the drafted bounty.`);
		}

		if (dbBountyResult.status != 'Draft') {
			console.log(`${bountyId} bounty is not drafted`);
			return ctx.send(`<@${ctx.user.id}> Sorry bounty is not drafted.`);
		}

		const currentDate = (new Date()).toISOString();
		const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
			$set: {
				createdBy: {
					discordHandle: ctx.user.username,
					discordId: ctx.user.id,
				},
				status: 'Open',
			},
			$push: {
				statusHistory: {
					status: 'Open',
					setAt: currentDate,
				},
			},
		});

		if (writeResult.modifiedCount != 1) {
			console.log(`failed to update record ${bountyId} for user <@${ctx.user.id}>`);
			return ctx.send(`<@${ctx.user.id}> Sorry something is not working, our devs are looking into it.`);
		}

		await db.close();
		return ctx.send(`<@${ctx.user.id}> Bounty now open! Check out the bounty at ${constants.BOUNTY_BOARD_URL}/${bountyId}`);
	});

};
