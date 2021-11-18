import { GuildMember, Message, MessageEmbed } from 'discord.js';
import BountyUtils from '../../utils/BountyUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../constants/constants';
import envUrls from '../constants/envUrls';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guildMember: GuildMember, bountyId: string, guildID: string, urlOfWork?: string, notes?: string): Promise<any> => {
	await BountyUtils.validateBountyId(guildMember, bountyId);
	
	if (urlOfWork) {
		await BountyUtils.validateUrl(guildMember, urlOfWork);
	}
	
	if (notes) {
		await BountyUtils.validateSummary(guildMember, notes);
	}
	return submitBountyForValidId(guildMember, bountyId, guildID, urlOfWork, notes);
};

export const submitBountyForValidId = async (guildMember: GuildMember,
	bountyId: string, guildID: string,
	urlOfWork?: string, notes?: string, message?: Message,
): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
	const dbCollection = db.collection(constants.DB_COLLECTION_BOUNTIES);

	const dbBountyResult: BountyCollection = await dbCollection.findOne({
		_id: new mongo.ObjectId(bountyId),
		status: 'In-Progress',
	});

	await BountyUtils.checkBountyExists(guildMember, dbBountyResult, bountyId);
	
	if (dbBountyResult.claimedBy.discordId !== guildMember.user.id) {
		Log.info(`${bountyId} bounty not claimed by ${guildMember.user.tag} but it is claimed by ${dbBountyResult.claimedBy.discordHandle}`);
		return guildMember.send({ content: `Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is claimed by someone else.` });
	}

	if (dbBountyResult.status !== 'In-Progress') {
		Log.info(`${bountyId} bounty not in progress`);
		return guildMember.send({ content: `Sorry <@${guildMember.user.id}>, bounty \`${bountyId}\` is not in progress.` });
	}

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await dbCollection.updateOne(dbBountyResult, {
		$set: {
			submittedBy: {
				discordHandle: guildMember.user.tag,
				discordId: guildMember.user.id,
				iconUrl: guildMember.user.avatarURL(),
			},
			submittedAt: currentDate,
			status: 'In-Review',
			submissionUrl: urlOfWork,
			submissionNotes: notes,
		},
		$push: {
			statusHistory: {
				status: 'In-Review',
				setAt: currentDate,
			},
		},
	});

	if (writeResult.modifiedCount != 1) {
		Log.info(`failed to update record ${bountyId} with submitted user  <@${guildMember.user.tag}>`);
		return guildMember.send({ content: 'Sorry something is not working, our devs are looking into it.' });
	}

	Log.info(`${bountyId} bounty submitted by ${guildMember.user.tag}`);
	await submitBountyMessage(db, guildMember, dbBountyResult.discordMessageId, guildID, message);
	
	const bountyUrl = envUrls.BOUNTY_BOARD_URL + dbBountyResult._id;
	const createdByUser: GuildMember = await guildMember.guild.members.fetch(dbBountyResult.createdBy.discordId);
	await createdByUser.send({ content: `Please reach out to <@${guildMember.user.id}>. They are ready for bounty review ${bountyUrl}` });

	return guildMember.send({ content: `Bounty in review! Expect a message from <@${dbBountyResult.createdBy.discordId}>` });
};

export const submitBountyMessage = async (db: Db, guildMember: GuildMember, 
	bountyMessageId: string, guildID: string, message?: Message
	): Promise<any> => {
	Log.debug('fetching bounty message for submit')
	message = await BountyUtils.getBountyMessage(db, guildMember, bountyMessageId, guildID, message);

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[3].value = 'In-Review';
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Submitted by', guildMember.user.tag, true);
	embedMessage.setFooter('✅ - complete | 🔄 - refresh | 🆘 - help');
	await message.edit({ embeds: [embedMessage] });
	await addSubmitReactions(message);
};

export const addSubmitReactions = async (message: Message): Promise<any> => {
	await message.reactions.removeAll();
	await message.react('✅');
	await message.react('🔄');
	await message.react('🆘');
};