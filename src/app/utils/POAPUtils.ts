import { GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection as MongoCollection, Cursor, Db, UpdateWriteOpResult } from 'mongodb';
import constants from '../service/constants/constants';
import { POAPParticipant } from '../types/poap/POAPParticipant';
import axios from 'axios';
import ValidationError from '../errors/ValidationError';

export type POAPFileParticipant = {
	id: string,
	tag: string,
	duration: number
};

const POAPUtils = {
	
	async getListOfParticipants(guildMember: GuildMember, db: Db, voiceChannel: GuildChannel): Promise<POAPFileParticipant[]> {
		const poapParticipants: MongoCollection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
		const resultCursor: Cursor<POAPParticipant> = await poapParticipants.find({
			voiceChannelId: voiceChannel.id,
			discordServerId: voiceChannel.guild.id,
		});

		if ((await resultCursor.count()) === 0) {
			console.log(`no participants found for ${voiceChannel.name} in ${voiceChannel.guild.name}`);
			return [];
		}
		
		let endTime: number = Date.now();
		const currentDateStr = (new Date()).toISOString();
		const participants = [];
		for await (const participant of resultCursor) {
			let result: UpdateWriteOpResult;
			try {
				result = await poapParticipants.updateOne(participant, {
					$set: {
						endDate: currentDateStr,
					},
				});
			} catch (e) {
				console.error(e);
			}
			if (result == null) {
				throw new Error('Mongodb operation failed');
			}
		}
		await resultCursor.forEach((participant: POAPParticipant) => {
			if (participant.endTime) {
				endTime = new Date(participant.endTime).getTime();
			}
			let durationInMinutes: number = (endTime - (new Date(participant.startTime)).getTime());
			durationInMinutes = (durationInMinutes <= 0) ? 0 : durationInMinutes / (1000 * 60);
			if (durationInMinutes >= 5) {
				participants.push({
					id: participant.discordUserId,
					tag: participant.discordUserTag,
					duration: durationInMinutes,
				});
			}
		});
		return participants;
	},

	async sendOutPOAPLinks(guildMember: GuildMember, listOfParticipants: POAPFileParticipant[], attachment: MessageAttachment): Promise<any> {
		let listOfPOAPLinks;
		try {
			const response = await axios.get(attachment.url);
			listOfPOAPLinks = response.data.split('\n');
		} catch (e) {
			console.error(e);
			return guildMember.send({ content: 'Could not process the links.txt file. Please make sure the file that is uploaded has every URL on a new line.' });
		}
		for (let i = 0; i < listOfParticipants.length; i++) {
			try {
				guildMember.guild.members.fetch(listOfParticipants[i].id)
					.then(async (participantMember: GuildMember) => {
						await participantMember.send({ content: `Thank you for participating in BanklessDAO! Here is your POAP: ${listOfPOAPLinks[i]}` }).catch((e) => {
							console.log(`failed trying to send POAP to: ${listOfParticipants[i].id}, userTag: ${listOfParticipants[i].tag}, link: ${listOfPOAPLinks[i]}`);
							console.error(e);
						});
					}).catch(async () => {
						console.log(`failed trying to find: ${listOfParticipants[i].id}, userTag: ${listOfParticipants[i].tag}, to give link ${listOfPOAPLinks[i]}`);
						const tryAgainMember: GuildMember = await guildMember.guild.members.fetch(listOfParticipants[i].id);
						console.log(`trying to send another message to user ${listOfParticipants[i].tag}`);
						await tryAgainMember.send({ content: `Thank you for participating in BanklessDAO! Here is your POAP: ${listOfPOAPLinks[i]}` }).catch((e) => {
							console.log(`failed trying to send POAP to: ${listOfParticipants[i].id}, userTag: ${listOfParticipants[i].tag}, link: ${listOfPOAPLinks[i]}`);
							console.error(e);
						});
					});
			} catch (e) {
				console.log('user might have been banned');
			}
		}
	},

	async validateEvent(guildMember: GuildMember, event: string): Promise<any> {
		if (event == null) {
			return;
		}
		const POAP_EVENT_REGEX = /^[\w\s\W]{1,250}$/;
		if (!POAP_EVENT_REGEX.test(event)) {
			await guildMember.send({
				content: `<@${guildMember.user.id}>\n` +
					'Please enter a valid event: \n' +
					'- 250 characters maximum\n ' +
					'- alphanumeric\n ' +
					'- special characters: .!@#$%&,?',
			});
			throw new ValidationError('Please try another event.');
		}
	},
};

export default POAPUtils;