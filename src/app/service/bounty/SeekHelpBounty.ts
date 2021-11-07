import { GuildMember } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db } from 'mongodb';
import constants from '../constants/constants';
import envUrls from '../constants/envUrls';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return seekHelpValidBountyId(guildMember, bountyId);
};

export const seekHelpValidBountyId = async (guildMember: GuildMember,
	bountyId: string,
): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	const bountyUrl = envUrls.BOUNTY_BOARD_URL + dbBountyResult._id;
	const createdByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.createdBy.discordId);
	const claimedByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.claimedBy.discordId);
	const sosUser: GuildMember = await guildMember.guild.members.fetch(process.env.DISCORD_BOUNTY_BOARD_SOS_ID);
	
	if (createdByUser.id === guildMember.id) {
		await sosUser.send({ content: `<@${guildMember.user.id}> from bankless DAO needs some help with bounty ${bountyUrl}. Please reach out to them to check.` });
	} else if (guildMember.id === claimedByUser.id) {
		await createdByUser.send({ content: `<@${guildMember.user.id}> from Bankless DAO needs some help with bounty ${bountyUrl}. Please reach out to them to check.` });
	}
	Log.info(`message sent requesting help for bounty ${bountyId} submitted by ${guildMember.user.tag}`);
	return guildMember.send({ content: `SOS sent, look out for a follow up message for bounty ${bountyUrl}` });
};