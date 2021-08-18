import { GuildMember, Message, MessageEmbed } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import { seekHelpValidBountyId } from './SeekHelpBounty';
import { BountyCollection } from '../../types/bounty/BountyCollection';

export default async (guildMember: GuildMember, bountyId: string, isComplete: boolean): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);

	if (!isComplete) {
		return seekHelpValidBountyId(guildMember, bountyId);
	}
	
	return completeBountyForValidId(guildMember, bountyId);
};

export const completeBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, message?: Message,
): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'In-Review',
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	
	if (dbBountyResult.createdBy.discordId !== guildMember.user.id) {
		console.log(`${bountyId} bounty created by ${guildMember.user.tag} but it is created by ${dbBountyResult.createdBy.discordHandle}`);
		return guildMember.send(`Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is created by someone else.`);
	}

	if (dbBountyResult.status !== 'In-Review') {
		console.log(`${bountyId} bounty not in review`);
		return guildMember.send(`Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is not in review`);
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			reviewedBy: {
				discordHandle: guildMember.user.tag,
				discordId: guildMember.user.id,
				iconUrl: guildMember.user.avatarURL(),
			},
			reviewedAt: currentDate,
			status: 'Completed',
		},
		$push: {
			statusHistory: {
				status: 'Completed',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} with reviewer user  <@${guildMember.user.tag}>`);
		return guildMember.send('Sorry something is not working, our devs are looking into it.');
	}
	await dbInstance.close();

	console.log(`${bountyId} bounty reviewed by ${guildMember.user.tag}`);
	await completeBountyMessage(guildMember, dbBountyResult.discordMessageId, message);

	return guildMember.send(`<@${guildMember.user.id}> Bounty complete! Please remember to tip <@${dbBountyResult.createdBy.discordId}>`);
};

export const completeBountyMessage = async (guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<any> => {
	message = await BountyUtils.getBountyMessage(guildMember, bountyMessageId, message);

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[3].value = 'Completed';
	embedMessage.setColor('#1d2124');
	embedMessage.addField('Reviewed By', guildMember.user.tag, true);
	embedMessage.setFooter('🆘 - help');
	await message.edit({ embeds: [embedMessage] });
	addCompletedReactions(message);
};

export const addCompletedReactions = (message: Message): void => {
	message.reactions.removeAll();
	message.react('🆘');
};