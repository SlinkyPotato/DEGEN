import constants from '../constants/constants';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import dbInstance from '../../utils/db';
import { GuildMember, Message, MessageEmbed } from 'discord.js';
import envUrls from '../constants/envUrls';
import { BountyCollection } from '../../types/bounty/BountyCollection';

export default async (guildMember: GuildMember, bountyId: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	return claimBountyForValidId(guildMember, bountyId);
};

export const claimBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, message?: Message,
): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);
	
	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
	});
	
	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);

	if (dbBountyResult.claimedBy && dbBountyResult.status != 'Open') {
		console.log(`${bountyId} bounty not open and is claimed by ${dbBountyResult.claimedBy.discordHandle}`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry bounty is not open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
	}

	if (dbBountyResult.status != 'Open') {
		console.log(`${bountyId} bounty is not open`);
		return guildMember.send(`<@${guildMember.user.id}> Sorry bounty is not Open. ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			claimedBy: {
				'discordHandle': guildMember.user.tag,
				'discordId': guildMember.user.id,
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
		console.log(`failed to update record ${bountyId} with claimed user  <@${guildMember.user.tag}>`);
		return guildMember.send('Sorry something is not working, our devs are looking into it.');
	}

	const createdByUser: GuildMember = guildMember.guild.member(dbBountyResult.createdBy.discordId);
	await createdByUser.send(`<@${createdByUser.id}> Bounty has been claimed ${envUrls.BOUNTY_BOARD_URL}${bountyId} Please reach out to <@${guildMember.user.id}> with any questions`);

	await dbInstance.close();
	console.log(`${bountyId} bounty claimed by ${guildMember.user.tag}`);
	await claimBountyMessage(guildMember, dbBountyResult.discordMessageId, message);
	
	return guildMember.send(`<@${guildMember.user.id}> Bounty claimed! If you have any questions, please reach out to <@${createdByUser.id}>. ${envUrls.BOUNTY_BOARD_URL}${bountyId}`);
};

export const claimBountyMessage = async (guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<any> => {
	console.log(`attempting to claim bountyMessageId: ${bountyMessageId}`);
	message = await BountyUtils.getBountyMessage(guildMember, bountyMessageId, message);
	
	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[1].value = 'In-Progress';
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Claimed By', guildMember.user.tag, true);
	embedMessage.setFooter('📮 - submit | 🔄 - refresh | 🆘 - help');
	await message.edit(embedMessage);
	addClaimReactions(message);
};

export const addClaimReactions = (message: Message): void => {
	message.reactions.removeAll();
	message.react('📮');
	message.react('🔄');
	message.react('🆘');
};