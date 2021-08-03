import { GuildMember, Message, MessageEmbed } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';

export default async (guildMember: GuildMember, bountyId: string, urlOfWork: string, notes: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	await BountyUtils.validateUrl(guildMember, urlOfWork);
	await BountyUtils.validateSummary(guildMember, notes);
	return submitBountyForValidId(guildMember, bountyId, urlOfWork, notes);
};

export const submitBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, urlOfWork: string, notes: string, message?: Message,
): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const dbBountyResult = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'In-Progress',
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult.discordMessageId, bountyId);
	
	if (dbBountyResult.claimedBy.discordId !== guildMember.user.id) {
		console.log(`${bountyId} bounty not claimed by ${guildMember.user.tag} but it is claimed by ${dbBountyResult.claimedBy.discordHandle}`);
		return guildMember.send(`Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is claimed by someone else.`);
	}

	if (dbBountyResult.status !== 'In-Progress') {
		console.log(`${bountyId} bounty not in progress`);
		return guildMember.send(`Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is not in progress.`);
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			submittedBy: {
				'discordHandle': guildMember.user.tag,
				'discordId': guildMember.user.id,
			},
			submittedAt: Date.now(),
			status: 'In-Review',
			submissionUrl: urlOfWork,
		},
		$push: {
			statusHistory: {
				status: 'In-Review',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		console.log(`failed to update record ${bountyId} with submitted user  <@${guildMember.user.tag}>`);
		return guildMember.send('Sorry something is not working, our devs are looking into it.');
	}
	await dbInstance.close();

	console.log(`${bountyId} bounty submitted by ${guildMember.user.tag}`);
	await submitBountyMessage(guildMember, dbBountyResult.discordMessageId, message);
	
	const bountyUrl = constants.BOUNTY_BOARD_URL + dbBountyResult._id;
	const createdByUser: GuildMember = guildMember.guild.member(dbBountyResult.createdBy.discordId);
	await createdByUser.send(`Hello <@${createdByUser.user.id}>! Bankless DAO user <@${guildMember.user.id}> has finished the bounty ${bountyUrl}. Please reach out to them to check.`);

	return guildMember.send(`<@${guildMember.user.id}> Bounty in review! Look out for a follow up message from <@${dbBountyResult.createdBy.id}>`);
};

export const submitBountyMessage = async (guildMember: GuildMember, bountyMessageId: string, message?: Message): Promise<any> => {
	message = (message === null) ? await BountyUtils.getBountyMessage(guildMember, bountyMessageId) : message;

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[1].value = 'In-Review';
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Submitted By', guildMember.user.tag, true);
	embedMessage.setFooter('✅ - complete | 🆘 - help | bounty is in review');
	await message.edit(embedMessage);

	await message.reactions.removeAll();
	await message.react('✅');
	await message.react('🆘');
};