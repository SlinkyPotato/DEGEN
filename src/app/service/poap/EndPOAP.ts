import { AwaitMessagesOptions, DMChannel, GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPSettings } from '../../types/poap/POAPSettings';
import POAPUtils, { FailedPOAPAttendee, POAPFileParticipant } from '../../utils/POAPUtils';
import { CommandContext } from 'slash-create';
import Log from '../../utils/Log';
import dayjs from 'dayjs';
import MongoDbUtils from '../../utils/dbUtils';

export default async (guildMember: GuildMember, ctx?: CommandContext): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (poapSettingsDoc == null) {
		throw new ValidationError(`<@${guildMember.id}> Hmm it doesn't seem you are hosting an active event.`);
	}
	const currentDateISO = dayjs().toISOString();
	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne(poapSettingsDoc, {
		$set: {
			isActive: false,
			endTime: currentDateISO,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new Error('failed to end event');
	}
	Log.debug(`event ended for ${guildMember.user.tag}`, {
		indexMeta: true,
		meta: {
			discordId: poapSettingsDoc.discordServerId,
			voiceChannelId: poapSettingsDoc.voiceChannelId,
			event: poapSettingsDoc.event,
		},
	});
	const channel: GuildChannel = await guildMember.guild.channels.fetch(poapSettingsDoc.voiceChannelId);
	const listOfParticipants: POAPFileParticipant[] = await POAPUtils.getListOfParticipants(db, channel);
	
	if (listOfParticipants.length <= 0) {
		await guildMember.send({ content: `Event ended. No participants found for \`${channel.name}\` in \`${channel.guild.name}\`.` });
		if (ctx) {
			await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
		}
		return;
	}
	
	const bufferFile = getBufferFromParticipants(listOfParticipants, channel);
	const currentDate = (new Date()).toISOString();
	const fileName = `${channel.guild.name}_${channel.name}_${listOfParticipants.length}_participants.csv`;
	await guildMember.send({
		embeds: [
			{
				title: 'Event Ended',
				fields: [
					{ name: 'Date', value: `${currentDate} UTC`, inline: true },
					{ name: 'Event', value: `${poapSettingsDoc.event}`, inline: true },
					{ name: 'Discord Server', value: channel.guild.name, inline: true },
					{ name: 'Location', value: channel.name, inline: true },
					{ name: 'Total Participants', value: `${listOfParticipants.length}`, inline: true },
				],
			},
		],
		files: [{ name: fileName, attachment: bufferFile }],
	});

	if (ctx) {
		await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
	}

	if (guildMember.id !== guildMember.user.id) {
		return guildMember.send({ content: `Previous event ended for <@${guildMember.id}>.` });
	}

	await guildMember.send({ content: 'Would you like me to send out POAP links to participants? `(yes/no)`' });
	const dmChannel: DMChannel = await guildMember.createDM();
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 900000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await guildMember.send({ content: 'Ok! Please upload the POAP links.txt file.' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const listOfFailedPOAPs: FailedPOAPAttendee[] = await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapLinksFile, poapSettingsDoc.event);
		const failedPOAPsBuffer: Buffer = getBufferForFailedParticipants(listOfFailedPOAPs);
		await guildMember.send({
			embeds: [
				{
					title: 'POAPs Distribution Results',
					fields: [
						{ name: 'Attempted to Send', value: `${listOfParticipants.length}`, inline: true },
						{ name: 'Successfully Sent', value: `${listOfParticipants.length - listOfFailedPOAPs.length}`, inline: true },
						{ name: 'Failed to Send', value: `${listOfFailedPOAPs.length}`, inline: true },
					],
				},
			],
			files: [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }],
		});

		Log.info('POAPs Distributed', {
			indexMeta: true,
			meta: {
				guildId: guildMember.guild.id,
				guildName: guildMember.guild.name,
				totalParticipants: listOfParticipants.length,
				location: channel.name,
			},
		});
		return 'POAP_SENT';
	} else {
		await guildMember.send({ content: 'You got it!' });
		return 'POAP_END';
	}
};

// TODO: Consolidate to single method generateCSV from object
const getBufferFromParticipants = (participants: POAPFileParticipant[], voiceChannel: GuildChannel): Buffer => {
	if (participants.length === 0) {
		Log.info(`no participants found for ${voiceChannel.name} in ${voiceChannel.guild.name}`);
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = 'discordId,discordHandle,durationInMinutes\n';
	participants.forEach((participant: {id: string, tag: string, duration: number}) => {
		participantsStr += `${participant.id},${participant.tag},${participant.duration}` + '\n';
	});

	return Buffer.from(participantsStr, 'utf-8');
};

export const getBufferForFailedParticipants = (failedPOAPs: FailedPOAPAttendee[]): Buffer => {
	if (failedPOAPs.length === 0) {
		Log.info('All POAPs delivered successfully');
		return Buffer.from('', 'utf-8');
	}
	
	let failedPOAPStr = 'discordUserId,discordUserTag,poapLink\n';
	failedPOAPs.forEach((failedPOAP: FailedPOAPAttendee) => {
		failedPOAPStr += `${failedPOAP.discordUserId},${failedPOAP.discordUserTag},${failedPOAP.poapLink}` + '\n';
	});

	return Buffer.from(failedPOAPStr, 'utf-8');
};