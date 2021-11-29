import { CommandContext } from 'slash-create';
import { GuildMember } from 'discord.js';
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

const StartTwitterFlow = async (ctx: CommandContext, guildMember: GuildMember, db: Db, event: string, duration: number): Promise<any> => {
	Log.debug('starting twitter poap flow...');
	
	await ctx.send('Sent you a DM!');
	const verifiedTwitter: VerifiedTwitter = await VerifyTwitter(guildMember);
	if (verifiedTwitter == null) {
		return;
	}
	const twitterClientV2: TwitterApi = new TwitterApi(apiKeys.twitterBearerToken);
	await ServiceUtils.tryDMUser(guildMember, 'Oh yea, time for a POAP event!...');
	
	let twitterSpaceResult: SpaceV2LookupResult;
	try {
		twitterSpaceResult = await twitterClientV2.v2.spacesByCreators(verifiedTwitter.twitterUser.id_str);
	} catch (e) {
		LogUtils.logError('failed trying to get twitter spaces', e);
	}
	
	if (twitterSpaceResult.meta.result_count == 0 || twitterSpaceResult.data == null || twitterSpaceResult.data[0]['state'] != 'live') {
		Log.warn('Twitter space result is not live');
		await guildMember.send({ content: 'Uh-oh, please start twitter spaces before starting POAP event. If you have already started it, please wait a minute or two before trying again.' });
		await ctx.send('Nothing to see here, carry on 😅... ');
		return;
	}
	
	const twitterSpaceId: string = twitterSpaceResult.data[0]['id'];
	Log.debug(`twitter spaces event active: ${twitterSpaceId}`);
	await ctx.send({ content: `Something really special is starting...:bird: https://twitter.com/i/spaces/${twitterSpaceId}` });
	
	const poapTwitterSettings: Collection<POAPTwitterSettings> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_SETTINGS);
	const activeSettings: POAPTwitterSettings = await poapTwitterSettings.findOne({
		discordUserId: guildMember.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (activeSettings != null) {
		Log.debug('unable to start twitter event due to active event');
		await guildMember.send('Looks like you have already started your POAP twitter space!');
		throw new ValidationError('Ha ha.. just kidding...');
	}
	
	Log.debug('setting up active twitter event in db');
	const currentDate: Dayjs = dayjs();
	const endTimeISO: string = currentDate.add(duration, 'minute').toISOString();
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
	}, {
		upsert: true,
		returnDocument: 'after',
	});
	
	if (twitterSettingsResult.ok != 1) {
		Log.warn('failed to insert twitter settings active event in db for poap organizer');
		throw new ValidationError('I\'m sorry something is not working, can you try again?');
	}
	
	Log.debug(`twitter poap event stored in db and set to active for userID: ${guildMember.id}, discordServerId: ${guildMember.guild.id}`);
	
	POAPService.setupAutoEndForEvent(guildMember.client, twitterSettingsResult.value, constants.PLATFORM_TYPE_TWITTER);
	const claimURL = `${apiKeys.twitterClaimPage}/${twitterSpaceId}`;
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Event Started',
				fields: [
					{ name: 'Event', value: `${event}`, inline: true },
					{ name: 'Organizer', value: `${guildMember.user.tag}`, inline: true },
					{ name: 'Discord Server', value: `${guildMember.guild.name}`, inline: true },
					{ name: 'Platform', value: 'Twitter', inline: true },
					{ name: 'Duration', value: `${duration} minutes`, inline: true },
					{ name: 'POAP Participation Claim Link', value: claimURL, inline: false },
				],
			},
		],
	});
	await guildMember.send({
		content: `POAP event setup! Please hand out ${claimURL} to your participants!`,
	});
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
		await guildMember.send('One more thing, there\'s a problem. Could be you. Could be me. Please Reach out the the event coordinator for your badge.');
	}
	Log.debug('POAP Twitter spaces event start message sent');
};

export default StartTwitterFlow;