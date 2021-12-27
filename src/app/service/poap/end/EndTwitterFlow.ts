import {
	GuildMember,
	MessageAttachment,
	TextChannel,
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
	let channelExecution: TextChannel | null = null;

	if (!isDmOn && ctx) {
		await ctx.send({ content: '⚠ Please make sure this is a private channel. I can help you distribute POAPs but anyone who has access to this channel can see the POAP links! ⚠', ephemeral: true });
	} else if (ctx) {
		await ctx.send({ content: 'Please check your DMs!', ephemeral: true });
	} else {
		if (activeTwitterSettings.channelExecutionId == null || activeTwitterSettings.channelExecutionId == '') {
			Log.debug(`channelExecutionId missing for ${guildMember.user.tag}, ${guildMember.user.id}, skipping poap end for expired event`);
			return;
		}
		channelExecution = await guildMember.guild.channels.fetch(activeTwitterSettings.channelExecutionId) as TextChannel;
		await channelExecution.send(`Hi <@${guildMember.user.id}>! Below are the participants results for ${activeTwitterSettings.event}`);
	}

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
	await POAPUtils.setupFailedAttendeesDelivery(guildMember, distributionResults, activeTwitterSettings.event, constants.PLATFORM_TYPE_TWITTER);
	await POAPUtils.handleDistributionResults(isDmOn, guildMember, distributionResults, channelExecution, ctx);
	Log.debug('POAP twitter end complete');
};

export default EndTwitterFlow;