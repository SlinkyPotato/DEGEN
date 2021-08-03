import { GuildMember } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../../constants';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return seekHelpValidBountyId(guildMember, bountyId);
};

export const seekHelpValidBountyId = async (guildMember: GuildMember,
	bountyId: string,
): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	await BountyUtils.checkBountyExists(guildMember, dbBountyResult.discordMessageId, bountyId);
	const bountyUrl = constants.BOUNTY_BOARD_URL + dbBountyResult._id;
	const createdByUser: GuildMember = guildMember.guild.member(dbBountyResult.createdBy.discordId);
	await createdByUser.send(`Hello <@${createdByUser.user.id}>! Bankless DAO user <@${guildMember.user.id}> needs some help with bounty ${bountyUrl}. Please reach out to them to check.`);
	await dbInstance.close();

	console.log(`message sent requesting help for bounty ${bountyId} submitted by ${guildMember.user.tag}`);
	return guildMember.send(`<@${guildMember.user.id}> seeking help! Look out for a follow up message for bounty ${bountyUrl}`);
};