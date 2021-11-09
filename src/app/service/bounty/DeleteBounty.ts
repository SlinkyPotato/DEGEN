import constants from '../constants/constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import ServiceUtils from '../../utils/ServiceUtils';
import BountyUtils from '../../utils/BountyUtils';
import { GuildMember, Message } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import BountyMessageNotFound from '../../errors/BountyMessageNotFound';
import roleIDs from '../constants/roleIds';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return deleteBountyForValidId(guildMember, bountyId);
};

export const deleteBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, message?: Message,
): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);

	if (dbBountyResult.status === 'Deleted') {
		Log.info(`${bountyId} bounty already deleted`);
		return guildMember.send(`<@${guildMember.user.id}> looks like bounty \`${bountyId}\` is already deleted!`);
	}

	if (!(ServiceUtils.hasRole(guildMember, roleIDs.admin) || dbBountyResult.createdBy.discordId === guildMember.id)) {
		Log.info(`${guildMember.user.tag} does not have access to delete bounty`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry you do not have access to delete!`);
	}

	Log.info(`${guildMember.user.tag} is authorized to delete bounties`);

	if (!(dbBountyResult.status === 'Draft' || dbBountyResult.status === 'Open')) {
		Log.info(`${bountyId} bounty is not open or in draft`);
		return guildMember.send(`Sorry bounty \`${bountyId}\` is not Open or in Draft.`);
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			deletedBy: {
				discordHandle: guildMember.user.tag,
				discordId: guildMember.user.id,
				iconUrl: guildMember.user.avatarURL(),
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
		Log.error(`failed to update record ${bountyId} with claimed user  <@${guildMember.user.id}>`);
		return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
	}

	Log.info(`${bountyId} bounty deleted by ${guildMember.user.tag}`);
	await deleteBountyMessage(guildMember, dbBountyResult.discordMessageId, message);
	return guildMember.send({ content: `Bounty \`${bountyId}\` deleted, thanks.` });
};

export const deleteBountyMessage = async (guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<any> => {
	return BountyUtils.getBountyMessage(guildMember, bountyMessageId, message)
		.then(embedMessage => {
			return embedMessage.delete();
		})
		.catch(e => {
			LogUtils.logError('failed to get bounty message', e);
			if (e instanceof BountyMessageNotFound) {
				return;
			}
		});
};