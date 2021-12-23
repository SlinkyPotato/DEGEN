import {
	AwaitMessagesOptions,
	DMChannel,
	GuildChannel,
	GuildMember,
	Message,
	MessageActionRow,
	MessageAttachment,
	MessageButton,
	MessageOptions,
	TextChannel,
} from 'discord.js';
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
import { Buffer } from 'buffer';
import ServiceUtils from './ServiceUtils';
import { MessageOptions as MessageOptionsSlash } from 'slash-create/lib/structures/interfaces/messageInteraction';
import { TwitterApiTokens } from 'twitter-api-v2/dist/types';
import { POAPDistributionResults } from '../types/poap/POAPDistributionResults';
import ApiKeys from '../service/constants/apiKeys';
import buttonIds from '../service/constants/buttonIds';

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
				if (result == null) {
					throw new Error('Mongodb operation failed');
				}
			} catch (e) {
				LogUtils.logError('failed to update poap participants with endTime', e);
			}
		}
		Log.debug('finished setting endDate for present participants in db');
	},
	
	async askForPOAPLinks(
		guildMember: GuildMember, isDmOn: boolean, numberOfParticipants: number, ctx?: CommandContext,
		adminChannel?: TextChannel | null,
	): Promise<MessageAttachment> {
		Log.debug('asking poap organizer for poap links attachment');
		const uploadLinksMsg = `Please upload the POAP links.txt file. This file should have a least ${numberOfParticipants} link(s). Each link should be on a new line.`;
		const replyOptions: AwaitMessagesOptions = {
			max: 1,
			time: 900000,
			errors: ['time'],
			filter: m => m.author.id == guildMember.user.id,
		};
		
		let message: Message | undefined;
		if (isDmOn) {
			await guildMember.send({ content: uploadLinksMsg });
			const dmChannel: DMChannel = await guildMember.createDM();
			message = (await dmChannel.awaitMessages(replyOptions)).first();
		} else if (ctx) {
			await ctx.sendFollowUp(uploadLinksMsg);
			const guildChannel: TextChannel = await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
			message = (await guildChannel.awaitMessages(replyOptions)).first();
		} else if (adminChannel != null) {
			await adminChannel.send(uploadLinksMsg);
			message = (await adminChannel.awaitMessages(replyOptions)).first();
		}
		
		if (message == null) {
			throw new ValidationError('Invalid attachment. Session ended. Please try the command again.');
		}
		
		const poapLinksFile: MessageAttachment | undefined = message.attachments.first();
		
		if (poapLinksFile == null) {
			throw new ValidationError('Invalid attachment. Session ended. Please try the command again.');
		}
		
		Log.debug(`obtained poap links attachment in discord: ${poapLinksFile.url}`);
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
	
	/**
	 * Mass send out message containing POAP link for each user
	 * @param guildMember
	 * @param listOfParticipants
	 * @param event
	 * @param listOfPOAPLinks
	 */
	async sendOutPOAPLinks(
		guildMember: GuildMember, listOfParticipants: POAPFileParticipant[], event: string, listOfPOAPLinks?: string[],
	): Promise<POAPDistributionResults> {
		Log.debug('preparing to send out poap links...');
		const failedPOAPsList: POAPFileParticipant[] = [];
		const guildName = guildMember.guild.name;
		
		let i = 0;
		const length = listOfParticipants.length;
		
		if (listOfPOAPLinks != null && listOfPOAPLinks.length < listOfParticipants.length) {
			throw new ValidationError('There is not enough POAP links for all the participants!');
		}
		
		const results: POAPDistributionResults = {
			successfullySent: 0,
			hasDMOff: 0,
			claimSetUp: 0,
			failedToSend: 0,
			totalParticipants: listOfParticipants.length,
			didNotSendList: [],
		};
		
		const poapHostRegex = /^http[s]?:\/\/poap\.xyz\/.*$/gis;
		
		while (i < length) {
			const participant: POAPFileParticipant | undefined = listOfParticipants.pop();
			if (participant == null) {
				Log.debug('participant null, skipping');
				++i;
				continue;
			}
			
			let poapLink: string | undefined = '';
			if (listOfPOAPLinks) {
				poapLink = listOfPOAPLinks.pop();
			} else {
				poapLink = participant.poapLink;
			}
			
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
				if (!poapLink.match(poapHostRegex)) {
					Log.warn('invalid POAP link provided', {
						indexMeta: true,
						meta: {
							participantId: guildMember.user.id,
							participantTag: guildMember.user.tag,
							discordServerId: guildMember.guild.id,
							event: event,
						},
					});
					failedPOAPsList.push({
						discordUserId: participant.discordUserId,
						discordUserTag: participant.discordUserTag,
						poapLink: 'Invalid POAP link',
					});
					continue;
				}
				const participantMember: GuildMember = await guildMember.guild.members.fetch(participant.discordUserId);
				
				if (!(await ServiceUtils.isDMEnabledForUser(participantMember))) {
					Log.debug('user has not opted in to DMs');
					results.hasDMOff++;
					failedPOAPsList.push({
						discordUserId: participant.discordUserId,
						discordUserTag: participant.discordUserTag,
						poapLink: poapLink,
					});
					continue;
				}
				
				const message: Message | void = await participantMember
					.send({
						content: `Thank you for participating in the ${event} from ${guildName}! Here is your POAP: ${poapLink}`,
						components: [
							new MessageActionRow().addComponents(
								new MessageButton()
									.setCustomId(buttonIds.POAP_REPORT_SPAM)
									.setLabel('Report')
									.setStyle('DANGER'),
							),
						],
					}).catch((e) => {
						failedPOAPsList.push({
							discordUserId: participant.discordUserId,
							discordUserTag: participant.discordUserTag,
							poapLink: poapLink,
						});
						LogUtils.logError(`failed trying to send POAP to: ${participant.discordUserId}, userTag: ${participant.discordUserTag}, link: ${poapLink}`, e);
						results.failedToSend++;
					});
				if (!message) {
					throw new Error('failed to send message');
				}
				message.awaitMessageComponent({
					filter: args => (args.customId == buttonIds.POAP_REPORT_SPAM && args.user.id == participant.discordUserId),
					time: 300_000,
				}).then((_) => {
					message.edit({ content: 'Report received, thank you!', components: [] });
					POAPUtils.reportPOAPOrganizer(guildMember).catch(Log.error);
				});
				results.successfullySent++;
			} catch (e) {
				LogUtils.logError('user might have been banned or has DMs off', e);
				failedPOAPsList.push({
					discordUserId: participant.discordUserId,
					discordUserTag: participant.discordUserTag,
					poapLink: poapLink,
				});
				results.failedToSend++;
			}
			i++;
		}
		results.didNotSendList = failedPOAPsList;
		Log.info(`Links sent to ${results.successfullySent} participants.`);
		return results;
	},
	
	async reportPOAPOrganizer(poapOrganizer: GuildMember): Promise<void> {
		Log.debug('attempting to report poap organizer or role');
		await poapOrganizer.fetch();
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const poapAdminsDb: Collection<POAPAdmin> = await db.collection(constants.DB_COLLECTION_POAP_ADMINS);
		const userResult: UpdateWriteOpResult = await poapAdminsDb.updateOne({
			objectType: constants.POAP_ADMIN_TYPE_ENUM_USER,
			discordObjectId: poapOrganizer.user.id.toString(),
		}, {
			$inc: {
				reported: 1,
			},
		});
		
		if (userResult.result.ok == 1) {
			Log.debug('poap organizer reported');
			return;
		}

		const rolesCursor: Cursor<POAPAdmin> = await poapAdminsDb.find({
			objectType: constants.POAP_ADMIN_TYPE_ENUM_ROLE,
			discordServerId: poapOrganizer.guild.id.toString(),
		});
		for await (const poapRole of rolesCursor) {
			if (poapOrganizer.roles.cache.some(role => role.id === poapRole.discordObjectId)) {
				await poapAdminsDb.updateOne({
					objectType: constants.POAP_ADMIN_TYPE_ENUM_ROLE,
					discordObjectId: poapRole.discordObjectId,
				}, {
					$inc: {
						reported: 1,
					},
				});
			}
		}
	},
	
	async sendOutTwitterPoapLinks(
		listOfParticipants: TwitterPOAPFileParticipant[], event: string,
		listOfPOAPLinks?: string[],
	): Promise<POAPDistributionResults> {
		Log.debug('preparing to send out poap links for twitter spaces');
		const failedPOAPList: TwitterPOAPFileParticipant[] = [];
		
		let i = 0;
		const length = listOfParticipants.length;
		
		if (listOfPOAPLinks != null && listOfPOAPLinks.length < listOfParticipants.length) {
			throw new ValidationError('There is not enough POAP links for all the participants!');
		}
		
		const results: POAPDistributionResults = {
			successfullySent: 0,
			hasDMOff: 0,
			claimSetUp: 0,
			failedToSend: 0,
			totalParticipants: listOfParticipants.length,
			didNotSendList: [],
		};
		
		const twitterClient: TwitterApi = new TwitterApi({
			appKey: apiKeys.twitterAppToken,
			appSecret: apiKeys.twitterAppSecret,
			accessToken: apiKeys.twitterAccessToken,
			accessSecret: apiKeys.twitterSecretToken,
		} as TwitterApiTokens);
		while (i < length) {
			const participant: TwitterPOAPFileParticipant | undefined = listOfParticipants.pop();
			if (participant == null) {
				i++;
				continue;
			}
			
			let poapLink: string | undefined = '';
			if (listOfPOAPLinks) {
				poapLink = listOfPOAPLinks.pop();
			} else {
				poapLink = participant.poapLink;
			}
			
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
				results.successfullySent++;
			} catch (e) {
				LogUtils.logError(`user might have been banned or has DMs off, failed trying to send POAP to twitterId: ${participant.twitterUserId}, twitterSpaceId: ${participant.twitterSpaceId}, link: ${poapLink}`, e);
				failedPOAPList.push({
					twitterUserId: participant.twitterUserId,
					twitterSpaceId: participant.twitterSpaceId,
					dateOfTweet: participant.dateOfTweet,
					poapLink: poapLink,
				});
				results.failedToSend++;
			}
			i++;
		}
		results.didNotSendList = failedPOAPList;
		Log.info(`Links sent to ${results.successfullySent} participants.`);
		return results;
	},
	
	async setupFailedAttendeesDelivery(
		guildMember: GuildMember, distributionResults: POAPDistributionResults,
		event: string, platform: string,
	): Promise<any> {
		Log.debug(`${distributionResults.didNotSendList} poaps were not sent`);
		
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		if (platform == constants.PLATFORM_TYPE_DISCORD) {
			const unclaimedCollection: Collection = db.collection(constants.DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS);
			const unclaimedPOAPsList: any[] = (distributionResults.didNotSendList as POAPFileParticipant[]).map((failedAttendee: POAPFileParticipant) => {
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
			const unclaimedPOAPsList: any[] = (distributionResults.didNotSendList as TwitterPOAPFileParticipant[]).map((failedAttendee: TwitterPOAPFileParticipant) => {
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
			distributionResults.claimSetUp = unclaimedPOAPsList.length;
		} else {
			Log.warn('missing platform type when trying to setup failed attendees');
		}
		Log.debug('stored poap claims for failed degens');
	},
	
	async handleDistributionResults(
		isDmOn: boolean, guildMember: GuildMember, distributionResults: POAPDistributionResults,
		channelExecution?: TextChannel | null, ctx?: CommandContext,
	): Promise<void> {
		const failedPOAPsBuffer: Buffer = ServiceUtils.generateCSVStringBuffer(distributionResults.didNotSendList);
		let distributionEmbedMsg: MessageOptionsSlash | MessageOptions = {
			embeds: [
				{
					title: 'POAPs Distribution Results',
					fields: [
						{ name: 'Attempted to Send', value: `${distributionResults.totalParticipants}`, inline: true },
						{ name: 'Successfully Sent', value: `${distributionResults.successfullySent}`, inline: true },
						{ name: 'Failed to Send', value: `${distributionResults.failedToSend}`, inline: true },
						{ name: 'POAP Claim Setup', value: `${distributionResults.claimSetUp}`, inline: true },
						{ name: 'Participants Not Opted-In', value: `${distributionResults.hasDMOff}`, inline: true },
					],
				},
			],
		};
		
		if (isDmOn) {
			distributionEmbedMsg = distributionEmbedMsg as MessageOptions;
			distributionEmbedMsg.files = [{ name: 'failed_to_send_poaps.csv', attachment: failedPOAPsBuffer }];
			await guildMember.send(distributionEmbedMsg).catch(Log.error);
		} else if (ctx) {
			distributionEmbedMsg = distributionEmbedMsg as MessageOptionsSlash;
			distributionEmbedMsg.file = [{ name: 'failed_to_send_poaps.csv', file: failedPOAPsBuffer }];
			await ctx.sendFollowUp(distributionEmbedMsg);
		} else if (channelExecution) {
			distributionEmbedMsg = distributionEmbedMsg as MessageOptions;
			await channelExecution.send(distributionEmbedMsg);
		}
		
		Log.info('POAPs Distributed', {
			indexMeta: true,
			meta: {
				guildId: guildMember.guild.id,
				guildName: guildMember.guild.name,
				totalParticipants: distributionResults.totalParticipants,
			},
		});
		if (distributionResults.successfullySent == distributionResults.totalParticipants) {
			Log.debug('all POAPs successfully delivered');
			const deliveryMsg = 'All POAPs delivered!';
			if (isDmOn) {
				await guildMember.send({ content: deliveryMsg }).catch(Log.error);
			} else if (ctx) {
				await ctx.sendFollowUp(deliveryMsg);
			}
		} else {
			const failedDeliveryMsg = `Looks like some degens have DMs off or they haven't opt-in for delivery. They can claim their POAPs by sending \`gm\` to <@${ApiKeys.DISCORD_BOT_ID}> or executing slash command  \`/poap claim\``;
			if (isDmOn) {
				await guildMember.send({ content: failedDeliveryMsg });
			} else if (ctx) {
				await ctx.sendFollowUp({ content: failedDeliveryMsg, ephemeral: true });
			}
		}
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
	
	validateMaximumPOAPClaims(numberOfPOAPs: number): void {
		if (numberOfPOAPs > 70) {
			throw new ValidationError('Too many POAPs! Please reach out support for help.');
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
		return duration;
	},
	
	async validateUserAccess(guildMember: GuildMember, db: Db): Promise<any> {
		const MAXIMUM_REPORTS_THRESHOLD = 5;
		const poapAdminsDb: Collection = await db.collection(constants.DB_COLLECTION_POAP_ADMINS);
		const userResult: POAPAdmin = await poapAdminsDb.findOne({
			objectType: constants.POAP_ADMIN_TYPE_ENUM_USER,
			discordObjectId: guildMember.user.id.toString(),
			discordServerId: guildMember.guild.id.toString(),
		});
		if (userResult != null) {
			if (userResult.reported >= MAXIMUM_REPORTS_THRESHOLD) {
				throw new ValidationError('Maximum user reports reached. Please reach out to support for help');
			}
			// user has access
			return;
		}
		const rolesCursor: Cursor<POAPAdmin> = await poapAdminsDb.find({
			objectType: constants.POAP_ADMIN_TYPE_ENUM_ROLE,
			discordServerId: guildMember.guild.id.toString(),
		});
		for await (const poapRole of rolesCursor) {
			if (guildMember.roles.cache.some(role => role.id === poapRole.discordObjectId)) {
				if (poapRole.reported >= MAXIMUM_REPORTS_THRESHOLD) {
					throw new ValidationError('Maximum user reports reached. Please reach out to support for help');
				}
				// role has access
				return;
			}
		}
		throw new ValidationError('Only authorized users can use this command. Please reach out to an admin for configuration help.');
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