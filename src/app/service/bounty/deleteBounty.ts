import { CommandContext } from 'slash-create';
import constants from '../../constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import ServiceUtils from '../../utils/ServiceUtils';
import dbInstance from '../../utils/db';
import BountyUtils from '../../utils/BountyUtils';
import { GuildMember } from 'discord.js';

export const deleteBounty = async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {

	const bountyId = ctx.options.delete['bounty-id'];
	await BountyUtils.validateBountyId(ctx, guildMember, bountyId);
	
	return deleteBountyForValidId(ctx, guildMember, bountyId);
};

export const deleteBountyForValidId = async (ctx: CommandContext, guildMember: GuildMember, bountyId: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	if (dbBountyResult == null) {
		console.log(`${bountyId} bounty not found in db`);
		return ctx.send(`Sorry <@${ctx.user.id}>, we're not able to find that bounty with ID \`${bountyId}\`.`);
	}

	if (dbBountyResult.status === 'Deleted') {
		console.log(`${bountyId} bounty already deleted`);
		return ctx.send(`<@${ctx.user.id}> looks like bounty \`${bountyId}\` is already deleted!`);
	}

	if (!(ServiceUtils.isAdmin(guildMember) || dbBountyResult.createdBy.discordId === guildMember.id)) {
		console.log(`${ctx.user.username}#${ctx.user.discriminator} does not have access to delete bounty`);
		return ctx.send(`<@${ctx.user.id}> Sorry you do not have access to delete!`);
	}

	if (!(dbBountyResult.status === 'Draft' || dbBountyResult.status === 'Open')) {
		console.log(`${bountyId} bounty is not open or in draft`);
		return ctx.send(`Sorry bounty \`${bountyId}\` is not Open or in Draft.`);
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			deletedBy: {
				'discordHandle': ctx.user.username + '#' + ctx.user.discriminator,
				'discordId': ctx.user.id,
			},
			status: 'Deleted',
		},
		$push: {
			statusHistory: {
				status: 'Deleted',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} with claimed user  <@${ctx.user.id}>`);
		return ctx.send('Sorry something is not working, our devs are looking into it.');
	}

	await dbInstance.close();
	return ctx.send(`Bounty \`${bountyId}\` deleted, thanks.`);
}