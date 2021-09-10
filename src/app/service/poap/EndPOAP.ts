import { AwaitMessagesOptions, DMChannel, GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPSettings } from '../../types/poap/POAPSettings';
import POAPUtils, { POAPFileParticipant } from '../../utils/POAPUtils';

export default async (guildMember: GuildMember): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (poapSettingsDoc == null) {
		throw new ValidationError(`No active event found for <@${guildMember.id}>.`);
	}
	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne(poapSettingsDoc, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError('Event is not active.');
	}
	console.log(`event ${poapSettingsDoc.event} ended in ${poapSettingsDoc.discordServerId} for ${poapSettingsDoc.voiceChannelName}`);
	const channel: GuildChannel = await guildMember.guild.channels.fetch(poapSettingsDoc.voiceChannelId);
	const listOfParticipants = await POAPUtils.getListOfParticipants(guildMember, db, channel);
	
	if (listOfParticipants.length <= 0) {
		return guildMember.send({ content: `Event ended. No participants found for ${channel.name} in ${channel.guild.name}.` });
	}
	
	const bufferFile = await getBufferFromParticipants(listOfParticipants, channel);
	const currentDate = (new Date()).toISOString();
	const fileName = `${channel.guild.name}_${channel.name}_${listOfParticipants.length}_participants.csv`;
	await guildMember.send({
		content: `Total Participants: \`${listOfParticipants.length} participants\`\n` +
			`Guild: \`${channel.guild.name}\`\n` +
			`Channel: \`${channel.name}\`\n` +
			`Date: \`${currentDate} UTC\`.`,
		files: [{ name: fileName, attachment: bufferFile }],
	});

	if (guildMember.id !== guildMember.user.id) {
		return guildMember.send({ content: `Previous event ended for <@${guildMember.id}>.` });
	}

	const sendOutPOAPReplyMessage = await guildMember.send({ content: 'Would you like me send out POAP links to participants? `(yes/no)`' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await guildMember.send({ content: 'Ok! Please upload the POAP links.txt file.' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapLinksFile);
	} else {
		await guildMember.send({ content: 'You got it!' });
	}
	return;
};

export const getBufferFromParticipants = async (participants: POAPFileParticipant[], voiceChannel: GuildChannel): Promise<Buffer> => {
	if (participants.length === 0) {
		console.log(`no participants found for ${voiceChannel.name} in ${voiceChannel.guild.name}`);
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = 'discordId,discordHandle,durationInMinutes\n';
	participants.forEach((participant: {id: string, tag: string, duration: number}) => {
		participantsStr += `${participant.id},${participant.tag},${participant.duration}` + '\n';
	});

	return Buffer.from(participantsStr, 'utf-8');
};