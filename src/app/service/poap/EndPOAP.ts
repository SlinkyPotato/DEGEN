import { GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
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
	Log.debug('attempting to end poap event');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	
	Log.debug('authorized to end poap event');
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await ServiceUtils.sendOutErrorMessage(ctx, 'Twitter is temporarily turned off. Please reach out to support with any questions');
		return;
		await endTwitterPOAPFlow(guildMember, db, ctx);
		return;
	}
	
	const poapSettingsDB: Collection<POAPSettings> = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
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
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Over already? Can\'t wait for the next one');
	
	if (!isDmOn && ctx) {
		await ctx.sendFollowUp({ content: 'That was a great event!' });
	}
	
	const currentDateISO = dayjs().toISOString();
	Log.debug('setting poap event to false in db');
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
	Log.debug(`poap event ended for ${guildMember.user.tag} and updated in db`, {
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
		const eventEndMsg = `POAP event ended. No participants found for \`${channel.name}\` in \`${channel.guild.name}\`.`;
		if (isDmOn) {
			await guildMember.send({ content: eventEndMsg });
		} else if (ctx) {
			await ctx.sendFollowUp(eventEndMsg);
		}
		return;
	}
	
	Log.debug(`found ${numberOfParticipants} participants in db`);
	const bufferFile = ServiceUtils.generateCSVStringBuffer(listOfParticipants);
	const currentDate: string = dayjs().toISOString();
	const fileName = `participants_${numberOfParticipants}.csv`;
	
	const embedOptions = {
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
	};
	
	if (isDmOn) {
		await guildMember.send(embedOptions);
	} else if (ctx) {
		await ctx.send(embedOptions);
	}

	if ((guildMember.id !== guildMember.user.id) && isDmOn) {
		return guildMember.send({ content: `Previous event ended for <@${guildMember.id}>.` });
	}
	
	const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, isDmOn, numberOfParticipants, ctx);
	const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
	const listOfFailedPOAPs: POAPFileParticipant[] = await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapSettingsDoc.event, listOfPOAPLinks);
	const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(listOfFailedPOAPs);
	const distributionEmbedMsg = {
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
	};
	
	if (isDmOn) {
		await guildMember.send(distributionEmbedMsg);
	} else if (ctx) {
		await ctx.send(distributionEmbedMsg);
	}
	
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
		const deliveryMsg = 'All POAPs delivered!';
		if (isDmOn) {
			await guildMember.send({ content: deliveryMsg });
		} else if (ctx) {
			await ctx.send(deliveryMsg);
		}
		return;
	}
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, listOfFailedPOAPs, poapSettingsDoc.event, constants.PLATFORM_TYPE_DISCORD, isDmOn, ctx);
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
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Over already? Can\'t wait for the next one');
	
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
		const endMsg = 'Event ended. No eligible attendees found during twitter event';
		if (isDmOn) {
			await guildMember.send({ content: endMsg });
		} else if (ctx) {
			await ctx.sendFollowUp(endMsg);
		}
		return;
	}
	
	const bufferFile: Buffer = ServiceUtils.generateCSVStringBuffer(listOfParticipants);
	const embedTwitterEnd = {
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
		files: [{ name: `twitter_participants_${numberOfParticipants}.csv`, attachment: bufferFile }],
	};
	if (isDmOn) {
		await guildMember.send(embedTwitterEnd);
	} else if (ctx) {
		await ctx.sendFollowUp(embedTwitterEnd);
	}
	
	const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, isDmOn, numberOfParticipants, ctx);
	const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
	const listOfFailedPOAPs: TwitterPOAPFileParticipant[] = await POAPUtils.sendOutTwitterPoapLinks(listOfParticipants, activeTwitterSettings.event, listOfPOAPLinks);
	const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(listOfFailedPOAPs);
	const distributionEmbedMsg = {
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
	};
	if (isDmOn) {
		await guildMember.send(distributionEmbedMsg);
	} else if (ctx) {
		await ctx.sendFollowUp(distributionEmbedMsg);
	}
	
	Log.info('POAPs Distributed');
	if (listOfFailedPOAPs.length <= 0) {
		Log.debug('all poap successfully delivered');
		const deliveryMsg = 'All POAPs delivered!';
		if (isDmOn) {
			await guildMember.send({ content: deliveryMsg });
		} else if (ctx) {
			await ctx.sendFollowUp(deliveryMsg);
		}
		return;
	}
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, listOfFailedPOAPs, activeTwitterSettings.event, constants.PLATFORM_TYPE_TWITTER, isDmOn, ctx);
};