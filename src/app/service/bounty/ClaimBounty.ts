import constants from '../constants/constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import { GuildMember, Message, MessageEmbed } from 'discord.js';
import envUrls from '../constants/envUrls';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return claimBountyForValidId(guildMember, bountyId);
};

export const claimBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, message?: Message,
): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	
	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);

	if (dbBountyResult.claimedBy && dbBountyResult.status != 'Open') {
		Log.info(`${bountyId} bounty not open and is claimed by ${dbBountyResult.claimedBy.discordHandle}`);
		return guildMember.send({ content: `Sorry bounty is not open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
	}

	if (dbBountyResult.status != 'Open') {
		Log.info(`${bountyId} bounty is not open`);
		return guildMember.send({ content: `Sorry bounty is not Open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			claimedBy: {
				discordHandle: guildMember.user.tag,
				discordId: guildMember.user.id,
				iconUrl: guildMember.user.avatarURL(),
			},
			claimedAt: currentDate,
			status: 'In-Progress',
		},
		$push: {
			statusHistory: {
				status: 'In-Progress',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		Log.error(`failed to update record ${bountyId} with claimed user  <@${guildMember.user.tag}>`);
		return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
	}

	const createdByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.createdBy.discordId);
	await createdByUser.send({ content: ` Bounty has been claimed ${envUrls.BOUNTY_BOARD_URL}${bountyId} Please reach out to <@${guildMember.user.id}> with any questions.` });

	Log.info(`${bountyId} bounty claimed by ${guildMember.user.tag}`);
	await claimBountyMessage(guildMember, dbBountyResult.discordMessageId, message);
	// await dbInstance.close();
	return guildMember.send({ content: ` Bounty claimed! If you have any questions, please reach out to <@${createdByUser.id}>. ${envUrls.BOUNTY_BOARD_URL}${bountyId}` });
};

export const claimBountyMessage = async (guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<any> => {
	Log.info(`attempting to claim bountyMessageId: ${bountyMessageId}`);
	message = await BountyUtils.getBountyMessage(guildMember, bountyMessageId, message);

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[3].value = 'In-Progress';
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Claimed by', guildMember.user.tag, true);
	embedMessage.setFooter('📮 - submit | 🔄 - refresh | 🆘 - help');
	await message.edit({ embeds: [embedMessage] });
	await addClaimReactions(message);
};

export const addClaimReactions = async (message: Message): Promise<any> => {
	await message.reactions.removeAll();
	await message.react('📮');
	await message.react('🔄');
	await message.react('🆘');
};