import { AwaitMessagesOptions, DMChannel, GuildChannel, GuildMember, MessageAttachment, TextChannel } from 'discord.js';
import { Collection, Collection as MongoCollection, Cursor, Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../service/constants/constants';
import { POAPParticipant } from '../types/poap/POAPParticipant';
import axios from 'axios';
import ValidationError from '../errors/ValidationError';
import { POAPAdmin } from '../types/poap/POAPAdmin';
import Log, { LogUtils } from './Log';
import dayjs, { Dayjs } from 'dayjs';
import DateUtils from './DateUtils';
import { CommandContext } from 'slash-create';
import MongoDbUtils from './MongoDbUtils';
import { POAPTwitterParticipants } from '../types/poap/POAPTwitterParticipants';
import TwitterApi, { DirectMessageCreateV1Result } from 'twitter-api-v2';
import apiKeys from '../service/constants/apiKeys';

export type POAPFileParticipant = {
	discordUserId: string,
	discordUserTag: string,
	durationInMinutes?: string,
	poapLink?: string
}

export type TwitterPOAPFileParticipant = {
	twitterUserId: string,
	twitterSpaceId: string,
	dateOfTweet: string,
	poapLink?: string,
}

const POAPUtils = {
	
	async getListOfParticipants(db: Db, voiceChannel: GuildChannel): Promise<POAPFileParticipant[]> {
		const poapParticipants: MongoCollection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
		const resultCursor: Cursor<POAPParticipant> = await poapParticipants.find({
			voiceChannelId: voiceChannel.id,
			discordServerId: voiceChannel.guild.id,
		});

		if ((await resultCursor.count()) === 0) {
			Log.debug(`no participants found for ${voiceChannel.name} in ${voiceChannel.guild.name}`);
			return [];
		}
		
		await POAPUtils.setEndDateForPresentParticipants(poapParticipants, resultCursor);

		const participants: POAPFileParticipant[] = [];
		await resultCursor.forEach((participant: POAPParticipant) => {
			if (participant.durationInMinutes >= constants.POAP_REQUIRED_PARTICIPATION_DURATION) {
				participants.push({
					discordUserId: participant.discordUserId,
					discordUserTag: participant.discordUserTag,
					durationInMinutes: participant.durationInMinutes.toString(),
				});
			}
		});
		return participants;
	},
	
	async getListOfTwitterParticipants(db: Db, twitterSpaceId: string): Promise<TwitterPOAPFileParticipant[]> {
		const poapParticipants: MongoCollection<POAPTwitterParticipants> = db.collection(constants.DB_COLLECTION_POAP_TWITTER_PARTICIPANTS);
		const result: Cursor<POAPTwitterParticipants> = await poapParticipants.find({
			twitterSpaceId: twitterSpaceId,
		});
		if ((await result.count()) === 0) {
			Log.debug(`no participants found for twitter space: ${twitterSpaceId}`);
			return [];
		}
		Log.debug(`found participants for twitter space event: ${twitterSpaceId}`);
		const participants: TwitterPOAPFileParticipant[] = [];
		await result.forEach((participant: POAPTwitterParticipants) => {
			participants.push({
				twitterUserId: participant.twitterUserId,
				twitterSpaceId: participant.twitterSpaceId,
				dateOfTweet: participant.dateOfTweet,
			});
		});
		Log.debug(`prepared ${participants.length} participants`);
		return participants;
	},
	
	async setEndDateForPresentParticipants(poapParticipantsCollection: MongoCollection, poapParticipantsCursor: Cursor<POAPParticipant>): Promise<void> {
		Log.debug('starting to set endDate for present participants in db');
		const currentDateStr = dayjs().toISOString();
		for await (const participant of poapParticipantsCursor) {
			if (participant.endTime != null) {
				// skip setting endDate for present endTime;
				continue;
			}
			let result: UpdateWriteOpResult;
			try {
				const currentDate: Dayjs = dayjs();
				const startTimeDate: Dayjs = dayjs(participant.startTime);
				let durationInMinutes: number = participant.durationInMinutes;
				if ((currentDate.unix() - startTimeDate.unix() > 0)) {
					durationInMinutes += ((currentDate.unix() - startTimeDate.unix()) / 60);
				}
				result = await poapParticipantsCollection.updateOne(participant, {
					$set: {
						endTime: currentDateStr,
						durationInMinutes: durationInMinutes,
					},
				});
			} catch (e) {
				LogUtils.logError('failed to update poap participants with endTime', e);
			}
			if (result == null) {
				throw new Error('Mongodb operation failed');
			}
		}
		Log.debug('finished setting endDate for present participants in db');
	},
	
	async askForPOAPLinks(guildMember: GuildMember, isDmOn: boolean, numberOfParticipants: number, ctx?: CommandContext): Promise<MessageAttachment> {
		Log.debug('asking poap organizer for poap links attachment');
		const uploadLinksMsg = `Please upload the POAP links.txt file. This file should have ${numberOfParticipants} links where each link is on a new line.`;
		const replyOptions: AwaitMessagesOptions = {
			max: 1,
			time: 900000,
			errors: ['time'],
			filter: m => m.author.id == guildMember.user.id,
		};
		let poapLinksFile: MessageAttachment;
		if (isDmOn) {
			await guildMember.send({ content: uploadLinksMsg });
			const dmChannel: DMChannel = await guildMember.createDM();
			poapLinksFile = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		} else if (ctx) {
			await ctx.sendFollowUp(uploadLinksMsg);
			const guildChannel: TextChannel = await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
			poapLinksFile = (await guildChannel.awaitMessages(replyOptions)).first().attachments.first();
		}
		Log.debug('obtained poap links attachment in discord');
		return poapLinksFile;
	},
	
	async getListOfPoapLinks(attachment: MessageAttachment): Promise<string[]> {
		Log.debug('downloading poap links file from discord server...');
		try {
			const response = await axios.get(attachment.url);
			let listOfPOAPLinks: string[] = response.data.split('\n');
			try {
				while (listOfPOAPLinks[listOfPOAPLinks.length - 1] == '') {
					listOfPOAPLinks.pop();
				}
			} catch (e) {
				listOfPOAPLinks = [];
			}
			Log.debug(`DEGEN given ${listOfPOAPLinks.length} poap links`);
			return listOfPOAPLinks;
		} catch (e) {
			LogUtils.logError('failed to process links.txt file', e);
			throw new ValidationError('Could not process the links.txt file. Please make sure the file that is uploaded has every URL on a new line.');
		}
	},

	async sendOutPOAPLinks(
		guildMember: GuildMember, listOfParticipants: POAPFileParticipant[], event: string, listOfPOAPLinks?: string[],
	): Promise<POAPFileParticipant[]> {
		Log.debug('preparing to send out poap links...');
		const failedPOAPsList: POAPFileParticipant[] = [];
		const guildName = guildMember.guild.name;
		
		let i = 0;
		const length = listOfParticipants.length;
		const isListOfPoapLinksPresent: boolean = listOfPOAPLinks != null && listOfPOAPLinks.length >= 1;
		
		if (listOfPOAPLinks.length < listOfParticipants.length) {
			throw new ValidationError('There is not enough POAP links for all the participants!');
		}
		
		while (i < length) {
			const participant: POAPFileParticipant = listOfParticipants.pop();
			const poapLink = (isListOfPoapLinksPresent) ? listOfPOAPLinks.pop() : participant.poapLink;
			if (poapLink == null || poapLink == '') {
				Log.warn('ran out of poap links...');
				failedPOAPsList.push({
					discordUserId: participant.discordUserId,
					discordUserTag: participant.discordUserTag,
					poapLink: 'n/a',
				});
				i++;
				continue;
			}
			if (participant.discordUserId.length < 17) {
				throw new ValidationError('There appears to be a parsing error. Please check that the discordUserID is greater than 16 digits.');
			}
			try {
				const participantMember = await guildMember.guild.members.fetch(participant.discordUserId);
				await participantMember.send({ content: `Thank you for participating in the ${event} from ${guildName}! Here is your POAP: ${poapLink}` }).catch((e) => {
					failedPOAPsList.push({
						discordUserId: participant.discordUserId,
						discordUserTag: participant.discordUserTag,
						poapLink: poapLink,
					});
					LogUtils.logError(`failed trying to send POAP to: ${participant.discordUserId}, userTag: ${participant.discordUserTag}, link: ${poapLink}`, e);
				});
			} catch (e) {
				LogUtils.logError('user might have been banned or has DMs off', e);
				failedPOAPsList.push({
					discordUserId: participant.discordUserId,
					discordUserTag: participant.discordUserTag,
					poapLink: poapLink,
				});
			}
			i++;
		}
		Log.info(`Links sent to ${length - failedPOAPsList.length} participants.`);
		return failedPOAPsList;
	},
	
	async sendOutTwitterPoapLinks(
		listOfParticipants: TwitterPOAPFileParticipant[], event: string,
		listOfPOAPLinks?: string[],
	): Promise<TwitterPOAPFileParticipant[]> {
		Log.debug('preparing to send out poap links for twitter spaces');
		const failedPOAPList: TwitterPOAPFileParticipant[] = [];
		
		let i = 0;
		const length = listOfParticipants.length;
		const isListOfPoapLinksPresent: boolean = listOfPOAPLinks != null && listOfPOAPLinks.length >= 1;
		const twitterClient: TwitterApi = new TwitterApi({
			appKey: apiKeys.twitterAppToken,
			appSecret: apiKeys.twitterAppSecret,
			accessToken: apiKeys.twitterAccessToken,
			accessSecret: apiKeys.twitterSecretToken,
		});
		while (i < length) {
			const participant: TwitterPOAPFileParticipant = listOfParticipants.pop();
			const poapLink = (isListOfPoapLinksPresent) ? listOfPOAPLinks.pop() : participant.poapLink;
			if (poapLink == null || poapLink == '') {
				Log.warn('ran out of poap links...');
				failedPOAPList.push({
					twitterUserId: participant.twitterUserId,
					twitterSpaceId: participant.twitterSpaceId,
					dateOfTweet: participant.dateOfTweet,
					poapLink: 'n/a',
				});
				i++;
				continue;
			}
			try {
				const result: void | DirectMessageCreateV1Result = await twitterClient.v1.sendDm({
					recipient_id: participant.twitterUserId,
					text: `Thank you for participating in ${event}. Here is your POAP: ${poapLink} Enjoy! (gm)`,
					quick_reply: {
						type: 'options',
						options: [
							{
								label: 'gm',
								description: 'Good Morning',
								metadata: 'good_morning',
							},
						],
					},
				});
				if (result == null || result['event'].type != 'message_create') {
					throw new Error();
				}
			} catch (e) {
				LogUtils.logError(`user might have been banned or has DMs off, failed trying to send POAP to twitterId: ${participant.twitterUserId}, twitterSpaceId: ${participant.twitterSpaceId}, link: ${poapLink}`, e);
				failedPOAPList.push({
					twitterUserId: participant.twitterUserId,
					twitterSpaceId: participant.twitterSpaceId,
					dateOfTweet: participant.dateOfTweet,
					poapLink: poapLink,
				});
			}
			i++;
		}
		Log.info(`Links sent to ${length - failedPOAPList.length} participants.`);
		return failedPOAPList;
	},
	
	async setupFailedAttendeesDelivery(
		guildMember: GuildMember, listOfFailedPOAPs: POAPFileParticipant[] | TwitterPOAPFileParticipant[],
		event: string, platform: string, ctx?: CommandContext,
	): Promise<any> {
		Log.debug(`${listOfFailedPOAPs.length} poaps failed to deliver`);
		await guildMember.send({
			content: 'Looks like some degens didn\'t make it... Let me set up a claim for them, all they need to do is `/poap claim`',
		});
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		
		if (platform == constants.PLATFORM_TYPE_DISCORD) {
			const unclaimedCollection: Collection = db.collection(constants.DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS);
			const unclaimedPOAPsList: any[] = (listOfFailedPOAPs as POAPFileParticipant[]).map((failedAttendee: POAPFileParticipant) => {
				const expirationISO: string = (dayjs().add(1, 'month')).toISOString();
				return {
					event: event,
					discordUserId: `${failedAttendee.discordUserId}`,
					discordUserTag: failedAttendee.discordUserTag,
					discordServerId: `${guildMember.guild.id}`,
					discordServerName: guildMember.guild.name,
					poapLink: `${failedAttendee.poapLink}`,
					expiresAt: expirationISO,
				};
			});
			Log.debug('attempting to store failed attendees into db');
			await unclaimedCollection.insertMany(unclaimedPOAPsList);
		} else if (platform == constants.PLATFORM_TYPE_TWITTER) {
			const unclaimedCollection: Collection = db.collection(constants.DB_COLLECTION_POAP_TWITTER_UNCLAIMED_PARTICIPANTS);
			const unclaimedPOAPsList: any[] = (listOfFailedPOAPs as TwitterPOAPFileParticipant[]).map((failedAttendee: TwitterPOAPFileParticipant) => {
				const expirationISO: string = (dayjs().add(1, 'month')).toISOString();
				return {
					event: event,
					discordServerId: `${guildMember.guild.id}`,
					discordServerName: guildMember.guild.name,
					poapLink: `${failedAttendee.poapLink}`,
					expiresAt: expirationISO,
					twitterUserId: failedAttendee.twitterUserId,
					twitterSpaceId: failedAttendee.twitterSpaceId,
				};
			});
			Log.debug('attempting to store failed attendees into db');
			await unclaimedCollection.insertMany(unclaimedPOAPsList);
		} else {
			Log.warn('missing platform type when trying to setup failed attendees');
		}
		
		Log.debug('stored poap claims for failed degens');
		if (ctx) {
			await ctx.send('POAPs sent! Some didn\'t make it... they can claim it with `/poap claim`');
		}
		await guildMember.send({ content: 'POAP claiming setup!' });
	},

	validateEvent(event?: string): void {
		if (event == null) {
			return;
		}
		const POAP_EVENT_REGEX = /^[\w\s\W]{1,250}$/;
		if (!POAP_EVENT_REGEX.test(event)) {
			throw new ValidationError(
				'Please enter a valid event: \n' +
				'- 250 characters maximum\n ' +
				'- alphanumeric\n ' +
				'- special characters: .!@#$%&,?');
		}
	},
	
	validateNumberToMint(numberToMint: number): void {
		if (numberToMint >= 1000 || numberToMint <= 0) {
			throw new ValidationError('A maximum of 1000 POAPs can be minted for a single event. Please let us know if you\'d like to see this increased. ');
		}
	},

	validateDuration(duration?: number): number {
		if (duration == null) {
			return constants.POAP_MAX_DURATION_MINUTES;
		}
		if (duration > constants.POAP_MAX_DURATION_MINUTES || duration < constants.POAP_REQUIRED_PARTICIPATION_DURATION) {
			throw new ValidationError(`Please try a value greater than ${constants.POAP_REQUIRED_PARTICIPATION_DURATION} and less than ${constants.POAP_MAX_DURATION_MINUTES} minutes.`);
		}
	},
	
	async validateUserAccess(guildMember: GuildMember, db: Db): Promise<any> {
		const poapAdminsDb: Collection = await db.collection(constants.DB_COLLECTION_POAP_ADMINS);
		const userResult: POAPAdmin = await poapAdminsDb.findOne({
			objectType: 'USER',
			discordObjectId: guildMember.user.id,
			discordServerId: guildMember.guild.id,
		});
		if (userResult != null) {
			// user has access
			return;
		}
		const rolesCursor: Cursor<POAPAdmin> = await poapAdminsDb.find({
			objectType: 'ROLE',
			discordServerId: guildMember.guild.id,
		});
		for await (const poapRole of rolesCursor) {
			if (guildMember.roles.cache.some(role => role.id === poapRole.discordObjectId)) {
				// role has access
				return;
			}
		}
		throw new ValidationError('Only authorized users can use this command. Please reach out to an admin for configuration help.');
	},
	
	validateClaimCode(code: string): void {
		if (code == null) {
			return;
		}
		const POAP_CODE_REGEX = /^[\w\s\W]{1,30}$/;
		if (!POAP_CODE_REGEX.test(code)) {
			throw new ValidationError('Please enter a claim code between 1 and 30 alphanumeric characters.');
		}
		Log.debug('user provided valid claim code');
	},
	
	getDateString(date: Dayjs): string {
		return date.format('MM-DD-YYYY');
	},
	
	getExpiryDate(date: string): string {
		try {
			const dateObject: Dayjs = DateUtils.getDate(date);
			return dateObject.add(1, 'month').format('MM-DD-YYYY');
		} catch (e) {
			LogUtils.logError('failed to parse expiry date', e);
			throw new Error('processing failed');
		}
	},
	
	getEventYear(startDateObj: Dayjs): string {
		return startDateObj.year().toString();
	},
	
};

export default POAPUtils;