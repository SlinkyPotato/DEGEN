import { CommandContext } from 'slash-create';
import {
	GuildMember,
	MessageOptions,
} from 'discord.js';
import { Collection, Db, FindAndModifyWriteOpResultObject } from 'mongodb';
import Log, { LogUtils } from '../../../utils/Log';
import VerifyTwitter, { VerifiedTwitter } from '../../account/VerifyTwitter';
import { SpaceV2LookupResult, TwitterApi } from 'twitter-api-v2';
import apiKeys from '../../constants/apiKeys';
import ServiceUtils from '../../../utils/ServiceUtils';
import { POAPTwitterSettings } from '../../../types/poap/POAPTwitterSettings';
import constants from '../../constants/constants';
import ValidationError from '../../../errors/ValidationError';
import dayjs, { Dayjs } from 'dayjs';
import POAPService from '../POAPService';
import { POAPTwitterParticipants } from '../../../types/poap/POAPTwitterParticipants';
import channelIds from '../../constants/channelIds';
import { MessageOptions as MessageOptionsSlash } from 'slash-create';

const StartTwitterFlow = async (ctx: CommandContext, guildMember: GuildMember, db: Db, event: string, duration: number): Promise<any> => {
	Log.debug('starting twitter poap flow...');
	
	const verifiedTwitter: VerifiedTwitter | undefined = await VerifyTwitter(ctx, guildMember, false);
	if (verifiedTwitter == null) {
		return;
	}
	const twitterClientV2: TwitterApi = new TwitterApi(apiKeys.twitterBearerToken as string);
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Hello! I can help start a POAP event!');
	
	await ctx.defer(true);
	
	if (isDmOn) {
		await ctx.send({ content: 'DM sent!', ephemeral: true });
	}
	
	let twitterSpaceResult: SpaceV2LookupResult | null = null;
	try {
		Log.debug(`twitterId: ${verifiedTwitter.twitterUser.id_str}`);
		twitterSpaceResult = await twitterClientV2.v2.spacesByCreators(verifiedTwitter.twitterUser.id_str);
		Log.debug(twitterSpaceResult.data);
	} catch (e) {
		LogUtils.logError('failed trying to get twitter spaces', e);
	}
	
	if (twitterSpaceResult == null || twitterSpaceResult.meta.result_count == 0 || twitterSpaceResult.data == null || twitterSpaceResult.data[0]['state'] != 'live') {
		Log.warn('Twitter space result is not live');
		const msgNotLive = 'Uh-oh, please start twitter spaces before starting POAP event. If you have already started it, please wait a minute or two before trying again.';
		if (isDmOn) {
			await guildMember.send({ content: msgNotLive });
		} else {
			await ctx.send({ content: msgNotLive, ephemeral: true });
		}
		return;
	}
	
	if (!isDmOn) {
		await ctx.send({ content: '⚠ **Please make sure this is a private channel.** I can help you setup the poap event! ⚠', ephemeral: true });
	}
	
	const twitterSpaceId: string = twitterSpaceResult.data[0]['id'];
	Log.debug(`twitter spaces event active: ${twitterSpaceId}`);
	
	await ctx.send({ content: `Something really special is starting...:bird: https://twitter.com/i/spaces/${twitterSpaceId}` });
	
	const poapTwitterSettings: Collection<POAPTwitterSettings> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
	const activeSettings: POAPTwitterSettings | null = await poapTwitterSettings.findOne({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeSettings != null) {
		Log.debug('unable to start twitter event due to active event');
		const msg = 'Looks like you have an active twitter spaces event!';
		if (isDmOn) {
			await ctx.send({ content: msg });
		}
		throw new ValidationError(msg);
	}
	
	Log.debug('setting up active twitter event in db');
	const currentDate: Dayjs = dayjs();
	const endTimeISO: string = currentDate.add(duration, 'minute').toISOString();
	const channelExecutionId: string = isDmOn ? channelIds.DM : ctx.channelID;
	const twitterSettingsResult: FindAndModifyWriteOpResultObject<POAPTwitterSettings> = await poapTwitterSettings.findOneAndReplace({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
	}, {
		isActive: true,
		event: event,
		startTime: currentDate.toISOString(),
		endTime: endTimeISO,
		discordUserId: guildMember.id,
		discordUserTag: guildMember.user.tag,
		discordServerId: guildMember.guild.id,
		twitterUserId: verifiedTwitter.twitterUser.id_str,
		twitterSpaceId: twitterSpaceId,
		channelExecutionId: channelExecutionId,
	} as POAPTwitterSettings, {
		upsert: true,
		returnDocument: 'after',
	});
	
	if (twitterSettingsResult.ok != 1) {
		Log.warn('failed to insert twitter settings active event in db for poap organizer');
		throw new ValidationError('I\'m sorry something is not working, can you try again?');
	}
	
	Log.debug(`twitter poap event stored in db and set to active for userID: ${guildMember.id}, discordServerId: ${guildMember.guild.id}`);
	
	POAPService.setupAutoEndForEvent(guildMember.client, twitterSettingsResult.value as POAPTwitterSettings, constants.PLATFORM_TYPE_TWITTER);
	const claimURL = `${apiKeys.twitterClaimPage}/${twitterSpaceId}`;
	
	const claimUrlMsg = `POAP event setup! Please hand out ${claimURL} to your participants!`;
	const eventStartedEmbed: MessageOptionsSlash | MessageOptions = {
		embeds: [
			{
				title: 'Twitter Event Started',
				fields: [
					{ name: 'Event', value: `${event}`, inline: true },
					{ name: 'Organizer', value: `${guildMember.user.tag}`, inline: true },
					{ name: 'Discord Server', value: `${guildMember.guild.name}`, inline: true },
					{ name: 'Platform', value: 'Twitter', inline: true },
					{ name: 'Duration', value: `${duration} minutes`, inline: true },
					{ name: 'POAP Participation Claim Link', value: claimUrlMsg, inline: false },
				],
			},
		],
	};
	if (isDmOn) {
		await guildMember.send(eventStartedEmbed as MessageOptions);
	} else {
		await ctx.send({ content: claimUrlMsg });
		await ctx.send(eventStartedEmbed as MessageOptionsSlash);
	}
	
	Log.debug('POAP Twitter spaces event start message sent');
	
	const poapTwitterParticipants: Collection<POAPTwitterParticipants> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_PARTICIPANTS);
	const result: FindAndModifyWriteOpResultObject<any> = await poapTwitterParticipants.findOneAndReplace({
		twitterSpaceId: twitterSpaceId,
		twitterUserId: verifiedTwitter.twitterUser.id_str,
	}, {
		twitterSpaceId: twitterSpaceId,
		twitterUserId: verifiedTwitter.twitterUser.id_str,
		dateOfTweet: currentDate.toISOString(),
	}, {
		upsert: true,
	});
	
	if (result.ok != 1) {
		throw new ValidationError('POAP event started but there was an issue with your claim...');
	}
	
	Log.debug('poap organizer added to participants db');
};

export default StartTwitterFlow;