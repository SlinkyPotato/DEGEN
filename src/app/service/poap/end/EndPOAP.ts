import {
	GuildChannel,
	GuildMember,
	MessageAttachment,
	MessageOptions,
	TextChannel,
} from 'discord.js';
import {
	Collection as MongoCollection,
	Collection,
	Cursor,
	Db,
	UpdateWriteOpResult,
} from 'mongodb';
import constants from '../../constants/constants';
import { POAPSettings } from '../../../types/poap/POAPSettings';
import POAPUtils, { POAPFileParticipant } from '../../../utils/POAPUtils';
import {
	CommandContext,
	MessageOptions as MessageOptionsSlash,
} from 'slash-create';
import Log from '../../../utils/Log';
import dayjs from 'dayjs';
import MongoDbUtils from '../../../utils/MongoDbUtils';
import ServiceUtils from '../../../utils/ServiceUtils';
import EndTwitterFlow from './EndTwitterFlow';
import { POAPDistributionResults } from '../../../types/poap/POAPDistributionResults';
import channelIds from '../../constants/channelIds';
import { POAPParticipant } from '../../../types/poap/POAPParticipant';
import { stopTrackingUserParticipation } from '../../../events/tracking/HandleParticipantDuringEvent';

export default async (guildMember: GuildMember, platform: string, ctx?: CommandContext): Promise<any> => {
	Log.debug('attempting to end poap event');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	
	Log.debug('authorized to end poap event');
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await EndTwitterFlow(guildMember, db, ctx);
		return;
	}
	
	const poapSettingsDB: Collection<POAPSettings> = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const poapSettingsDoc: POAPSettings | null | void = await poapSettingsDB.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	}).catch(Log.error);
	
	if (poapSettingsDoc == null) {
		Log.debug('poap event not found');
		if (ctx) {
			await ctx.send({ content: 'Hmm it doesn\'t seem you are hosting an active event.', ephemeral: true });
		}
		return;
	}
	
	Log.debug('active poap event found');
	
	let channelExecution: TextChannel | null = null;
	
	if (ctx) {
		await ctx.send({ content: '⚠ Please make sure this is a private channel. I can help you distribute POAPs but anyone who has access to this channel can see the POAP links! ⚠', ephemeral: true });
	} else if (poapSettingsDoc.channelExecutionId != channelIds.DM) {
		if (poapSettingsDoc.channelExecutionId == null || poapSettingsDoc.channelExecutionId == '') {
			Log.debug(`channelExecutionId missing for ${guildMember.user.tag}, ${guildMember.user.id}, skipping poap end for expired event`);
			return;
		}
		channelExecution = await guildMember.guild.channels.fetch(poapSettingsDoc.channelExecutionId) as TextChannel;
		await channelExecution.send(`Hi <@${guildMember.user.id}>! Below are the participants results for ${poapSettingsDoc.event}`);
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
			guildId: poapSettingsDoc.discordServerId,
			voiceChannelId: poapSettingsDoc.voiceChannelId,
			event: poapSettingsDoc.event,
		},
	});
	const channel: GuildChannel | null = await guildMember.guild.channels.fetch(poapSettingsDoc.voiceChannelId);
	
	if (channel == null) {
		Log.warn('channel not found, might have been deleted, oh well');
	}
	
	await handleEventEndForPresentParticipants(poapSettingsDoc);
	const listOfParticipants: POAPFileParticipant[] = await POAPUtils.getListOfParticipants(poapSettingsDoc);
	const numberOfParticipants: number = listOfParticipants.length;
	
	if (numberOfParticipants <= 0) {
		Log.debug('no eligible attendees found during event');
		const eventEndMsg = `POAP event ended. No participants found for \`${channel?.name}\` in \`${channel?.guild.name}\`.`;
		if (ctx) {
			await ctx.sendFollowUp(eventEndMsg);
		}
		return;
	}
	
	Log.debug(`found ${numberOfParticipants} participants in db`);
	const bufferFile = ServiceUtils.generateCSVStringBuffer(listOfParticipants);
	const currentDate: string = dayjs().toISOString();
	const fileName = `participants_${numberOfParticipants}.csv`;
	
	let embedOptions: MessageOptionsSlash | MessageOptions = {
		embeds: [
			{
				title: 'Event Ended',
				fields: [
					{ name: 'Date', value: `${currentDate} UTC`, inline: true },
					{ name: 'Event', value: `${poapSettingsDoc.event}`, inline: true },
					{ name: 'Discord Server', value: `${channel?.guild.name} `, inline: true },
					{ name: 'Location', value: `${channel?.name} `, inline: true },
					{ name: 'Total Participants', value: `${numberOfParticipants}`, inline: true },
				],
			},
		],
	};
	
	if (ctx) {
		embedOptions = embedOptions as MessageOptionsSlash;
		embedOptions.file = [{ name: fileName, file: bufferFile }];
		await ctx.send(embedOptions);
	} else if (channelExecution != null) {
		embedOptions = embedOptions as MessageOptions;
		embedOptions.files = [{ name: fileName, attachment: bufferFile }];
		await channelExecution.send(embedOptions);
	}
	
	const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, numberOfParticipants, ctx, channelExecution);
	const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
	const distributionResults: POAPDistributionResults = await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapSettingsDoc.event, listOfPOAPLinks);
	if (distributionResults.didNotSendList.length > 0) {
		await POAPUtils.setupFailedAttendeesDelivery(guildMember, distributionResults, poapSettingsDoc.event, constants.PLATFORM_TYPE_DISCORD);
	}
	await POAPUtils.handleDistributionResults(guildMember, distributionResults, channelExecution, ctx);
	Log.debug('POAP end complete');
};

const handleEventEndForPresentParticipants = async (
	poapSettingsDoc: POAPSettings,
): Promise<void> => {
	Log.debug('starting to handle present members for end of poap event');
	const participantsCursor: Cursor<POAPParticipant> = await getPoapParticipantsFromDB(poapSettingsDoc.voiceChannelId, poapSettingsDoc.discordServerId);
	for await (const participant of participantsCursor) {
		if (participant.endTime == null || participant.endTime == '') {
			await stopTrackingUserParticipation({ id: participant.discordUserId, tag: participant.discordUserTag }, participant.discordServerId, participant.voiceChannelId, participant);
		}
	}
	Log.debug('finished setting endDate for present participants in db');
};

export const getPoapParticipantsFromDB = async (channelId: string, guildId: string): Promise<Cursor<POAPParticipant>> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapParticipants: MongoCollection<POAPParticipant> = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	return poapParticipants.find({
		voiceChannelId: channelId,
		discordServerId: guildId,
	});
};
