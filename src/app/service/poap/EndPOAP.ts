import { AwaitMessagesOptions, DMChannel, GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPSettings } from '../../types/poap/POAPSettings';
import POAPUtils, { POAPFileParticipant, TwitterPOAPFileParticipant } from '../../utils/POAPUtils';
import { CommandContext } from 'slash-create';
import Log from '../../utils/Log';
import dayjs, { Dayjs } from 'dayjs';
import MongoDbUtils from '../../utils/MongoDbUtils';
import ServiceUtils from '../../utils/ServiceUtils';
import { POAPTwitterSettings } from '../../types/poap/POAPTwitterSettings';

export default async (guildMember: GuildMember, platform: string, ctx?: CommandContext): Promise<any> => {
	Log.debug('attempting to ending poap event');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	
	Log.debug('authorized to end poap event');
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await endTwitterPOAPFlow(guildMember, db, ctx);
		return;
	}
	
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (poapSettingsDoc == null) {
		Log.debug('poap event not found');
		throw new ValidationError(`<@${guildMember.id}> Hmm it doesn't seem you are hosting an active event.`);
	}
	
	Log.debug('active poap event found');
	
	await ServiceUtils.tryDMUser(guildMember, 'Over already? Can\'t wait for the next one...');
	const currentDateISO = dayjs().toISOString();
	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne(poapSettingsDoc, {
		$set: {
			isActive: false,
			endTime: currentDateISO,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		Log.warn('failed to end poap event');
		throw new Error('failed to end event in db');
	}
	Log.debug(`event ended for ${guildMember.user.tag} and updated in db`, {
		indexMeta: true,
		meta: {
			discordId: poapSettingsDoc.discordServerId,
			voiceChannelId: poapSettingsDoc.voiceChannelId,
			event: poapSettingsDoc.event,
		},
	});
	const channel: GuildChannel = await guildMember.guild.channels.fetch(poapSettingsDoc.voiceChannelId);
	const listOfParticipants: POAPFileParticipant[] = await POAPUtils.getListOfParticipants(db, channel);
	const numberOfParticipants: number = listOfParticipants.length;
	
	if (numberOfParticipants <= 0) {
		Log.debug('no eligible attendees found during event');
		await guildMember.send({ content: `Event ended. No participants found for \`${channel.name}\` in \`${channel.guild.name}\`.` });
		if (ctx) {
			await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
		}
		return;
	}
	
	const bufferFile = getBufferFromParticipants(listOfParticipants);
	const currentDate: string = dayjs().toISOString();
	const fileName = `participants_${numberOfParticipants}.csv`;
	await guildMember.send({
		embeds: [
			{
				title: 'Event Ended',
				fields: [
					{ name: 'Date', value: `${currentDate} UTC`, inline: true },
					{ name: 'Event', value: `${poapSettingsDoc.event}`, inline: true },
					{ name: 'Discord Server', value: channel.guild.name, inline: true },
					{ name: 'Location', value: channel.name, inline: true },
					{ name: 'Total Participants', value: `${numberOfParticipants}`, inline: true },
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

	await guildMember.send({ content: 'Would you like me to send out POAP links to participants? `(y/n)`' });
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
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(guildMember, poapLinksFile);
		const listOfFailedPOAPs: POAPFileParticipant[] = await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapSettingsDoc.event, listOfPOAPLinks);
		const failedPOAPsBuffer: Buffer = getBufferForFailedParticipants(listOfFailedPOAPs);
		await guildMember.send({
			embeds: [
				{
					title: 'POAPs Distribution Results',
					fields: [
						{ name: 'Attempted to Send', value: `${numberOfParticipants}`, inline: true },
						{ name: 'Successfully Sent... wgmi', value: `${numberOfParticipants - listOfFailedPOAPs.length}`, inline: true },
						{ name: 'Failed to Send... ngmi', value: `${listOfFailedPOAPs.length}`, inline: true },
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
				totalParticipants: numberOfParticipants,
				location: channel.name,
			},
		});
		if (listOfFailedPOAPs.length <= 0) {
			Log.debug('all poap successfully delivered');
			if (ctx) {
				await ctx.send('POAPS sent! Expect delivery shortly.');
			}
			return;
		}
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, listOfFailedPOAPs, poapSettingsDoc.event, constants.PLATFORM_TYPE_DISCORD, ctx);
	} else {
		await guildMember.send({ content: 'Cool, POAPs can be delivered at a later time.' });
		if (ctx) {
			await ctx.send('POAP event ended. POAPs will be delivered at a later time.');
		}
	}
};

const getBufferFromParticipants = (participants: POAPFileParticipant[]): Buffer => {
	if (participants.length === 0) {
		Log.debug('no participants found for parsing');
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = 'discordId,discordHandle,durationInMinutes\n';
	participants.forEach((participant: POAPFileParticipant) => {
		participantsStr += `${participant.discordUserId},${participant.discordUserTag},${participant.durationInMinutes}\n`;
	});

	return Buffer.from(participantsStr, 'utf-8');
};

const getBufferFromParticipantsTwitter = (participants: TwitterPOAPFileParticipant[]): Buffer => {
	if (participants.length === 0) {
		Log.debug('no participants found for parsing');
		return Buffer.from('', 'utf-8');
	}
	
	let participantsStr = 'twitterUserId,checkInDateISO\n';
	participants.forEach((participant: TwitterPOAPFileParticipant) => {
		participantsStr += `${participant.twitterUserId},${participant.checkInDateISO}\n`;
	});
	
	return Buffer.from(participantsStr, 'utf-8');
};


export const getBufferForFailedParticipants = (failedPOAPs: POAPFileParticipant[]): Buffer => {
	if (failedPOAPs.length === 0) {
		Log.info('All POAPs delivered successfully');
		return Buffer.from('', 'utf-8');
	}
	
	let failedPOAPStr = 'discordUserId,discordUserTag,poapLink\n';
	failedPOAPs.forEach((failedPOAP: POAPFileParticipant) => {
		failedPOAPStr += `${failedPOAP.discordUserId},${failedPOAP.discordUserTag},${failedPOAP.poapLink}\n`;
	});

	return Buffer.from(failedPOAPStr, 'utf-8');
};

const endTwitterPOAPFlow = async (guildMember: GuildMember, db: Db, ctx?: CommandContext): Promise<any> => {
	Log.debug('starting twitter poap end flow...');
	
	const poapTwitterSettings: Collection<POAPTwitterSettings> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
	const activeTwitterSettings: POAPTwitterSettings = await poapTwitterSettings.findOne({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeTwitterSettings == null) {
		Log.debug('POAP twitter event not found');
		throw new ValidationError(`<@${guildMember.id}> Hmm it doesn't seem you are hosting an active twitter event.`);
	}
	
	Log.debug('active twitter poap event found');
	await ServiceUtils.tryDMUser(guildMember, 'Over already? Can\'t wait for the next one...');
	
	const currentDate: Dayjs = dayjs();
	const updateTwitterEventSettings: UpdateWriteOpResult = await poapTwitterSettings.updateOne(activeTwitterSettings, {
		$set: {
			isActive: false,
			endTime: currentDate.toISOString(),
		},
	});
	
	if (updateTwitterEventSettings.modifiedCount !== 1) {
		Log.warn('failed to end twitter poap event');
		throw new Error('failed to end twitter poap event in db');
	}
	Log.debug(`event ended for ${guildMember.user.tag} and set to inactive in db`);
	const listOfParticipants: TwitterPOAPFileParticipant[] = await POAPUtils.getListOfTwitterParticipants(db, activeTwitterSettings.twitterSpaceId);
	const numberOfParticipants: number = listOfParticipants.length;
	
	if (numberOfParticipants <= 0) {
		Log.debug('no eligible attendees found during event');
		await guildMember.send({ content: 'Event ended. No eligible attendees found during twitter event' });
		if (ctx) {
			await ctx.send('*whisper* check your DMs');
		}
		return;
	}
	
	const bufferFile: Buffer = getBufferFromParticipantsTwitter(listOfParticipants);
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Event Ended',
				fields: [
					{ name: 'Date', value: `${currentDate} UTC`, inline: true },
					{ name: 'Event', value: `${activeTwitterSettings.event}`, inline: true },
					{ name: 'Total Participants', value: `${numberOfParticipants}`, inline: true },
				],
			},
		],
		files: [{ name: `participants_${numberOfParticipants}.csv`, attachment: bufferFile }],
	});
	if (ctx) {
		await ctx.send('*whisper* check your DMs');
	}
	await guildMember.send({ content: 'Would you like me to send out POAP links to participants? `(y/n)`' });
	const dmChannel: DMChannel = await guildMember.createDM();
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 900000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await guildMember.send({ content: 'Ok! Please upload the links.txt file.' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(guildMember, poapLinksFile);
		const listOfFailedPOAPs: POAPFileParticipant[] = await POAPUtils.sendOutTwitterPoapLinks();

		const failedPOAPsBuffer: Buffer = getBufferForFailedParticipants(listOfFailedPOAPs);
		await guildMember.send({
			embeds: [
				{
					title: 'POAPs Distribution Results',
					fields: [
						{ name: 'Attempted to Send', value: `${numberOfParticipants}`, inline: true },
						{
							name: 'Successfully Sent... wgmi',
							value: `${numberOfParticipants - listOfFailedPOAPs.length}`,
							inline: true,
						},
						{ name: 'Failed to Send... ngmi', value: `${listOfFailedPOAPs.length}`, inline: true },
					],
				},
			],
			files: [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }],
		});
		Log.info('POAPs Distributed');
		if (listOfFailedPOAPs.length <= 0) {
			Log.debug('all poap successfully delivered');
			return;
		}
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, listOfFailedPOAPs, activeTwitterSettings.event, constants.PLATFORM_TYPE_DISCORD, ctx);
	}
	return;
};