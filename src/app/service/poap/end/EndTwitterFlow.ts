import {
	GuildMember,
	MessageAttachment,
	MessageOptions,
} from 'discord.js';
import {
	Collection,
	Db,
	UpdateWriteOpResult,
} from 'mongodb';
import { CommandContext } from 'slash-create';
import Log from '../../../utils/Log';
import { POAPTwitterSettings } from '../../../types/poap/POAPTwitterSettings';
import constants from '../../constants/constants';
import ValidationError from '../../../errors/ValidationError';
import ServiceUtils from '../../../utils/ServiceUtils';
import dayjs, { Dayjs } from 'dayjs';
import POAPUtils, { TwitterPOAPFileParticipant } from '../../../utils/POAPUtils';
import { Buffer } from 'buffer';
import { MessageOptions as MessageOptionsSlash } from 'slash-create/lib/structures/interfaces/messageInteraction';
import { POAPDistributionResults } from '../../../types/poap/POAPDistributionResults';

const EndTwitterFlow = async (guildMember: GuildMember, db: Db, ctx?: CommandContext): Promise<any> => {
	Log.debug('starting twitter poap end flow...');
	
	const poapTwitterSettings: Collection<POAPTwitterSettings> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
	const activeTwitterSettings: POAPTwitterSettings | null = await poapTwitterSettings.findOne({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeTwitterSettings == null) {
		Log.debug('POAP twitter event not found');
		throw new ValidationError('Hmm it doesn\'t seem you are hosting an active twitter event.');
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
			await ctx.send({ content: endMsg, ephemeral: true });
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
		await ctx.send(embedTwitterEnd);
	}
	
	const poapLinksFile: MessageAttachment = await POAPUtils.askForPOAPLinks(guildMember, isDmOn, numberOfParticipants, ctx);
	const listOfPOAPLinks: string[] = await POAPUtils.getListOfPoapLinks(poapLinksFile);
	const distributionResults: POAPDistributionResults = await POAPUtils.sendOutTwitterPoapLinks(listOfParticipants, activeTwitterSettings.event, listOfPOAPLinks);
	const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(distributionResults.didNotSendList);
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, distributionResults, activeTwitterSettings.event, constants.PLATFORM_TYPE_TWITTER);
	let distributionEmbedMsg: MessageOptionsSlash | MessageOptions = {
		embeds: [
			{
				title: 'POAPs Distribution Results',
				fields: [
					{ name: 'Attempted to Send', value: `${numberOfParticipants}`, inline: true },
					{ name: 'Successfully Sent', value: `${distributionResults.successfullySent}`, inline: true },
					{ name: 'Failed to Send', value: `${distributionResults.failedToSend}`, inline: true },
					{ name: 'POAP Claim Setup', value: `${distributionResults.claimSetUp}` },
					{ name: 'Participants Not Opted-In', value: `${distributionResults.hasDMOff}`, inline: true },
				],
			},
		],
	};
	if (isDmOn) {
		distributionEmbedMsg = distributionEmbedMsg as MessageOptions;
		distributionEmbedMsg.files = [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }];
		await guildMember.send(distributionEmbedMsg);
	} else if (ctx) {
		distributionEmbedMsg = distributionEmbedMsg as MessageOptionsSlash;
		distributionEmbedMsg.file = [{ name: 'failed_to_send_poaps.csv', file: bufferFile }];
		await ctx.sendFollowUp(distributionEmbedMsg);
	}
	
	Log.info('POAPs Distributed');
	if (distributionResults.successfullySent == distributionResults.totalParticipants) {
		Log.debug('all poap successfully delivered');
		const deliveryMsg = 'All POAPs delivered!';
		if (isDmOn) {
			await guildMember.send({ content: deliveryMsg });
		} else if (ctx) {
			await ctx.sendFollowUp(deliveryMsg);
		}
		return;
	}
};

export default EndTwitterFlow;