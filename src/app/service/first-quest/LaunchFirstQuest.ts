import {DMChannel, GuildMember, TextBasedChannels} from 'discord.js';
import constants from '../constants/constants';
import Log from '../../utils/Log';
import dbInstance from '../../utils/dbUtils';
import { Db } from 'mongodb';
import client from '../../app';

setInterval(async function (): Promise<void> { await fqRescueCall() }, (1000*60*60*10));

export default async (member: GuildMember, dmChan:TextBasedChannels | string ): Promise<any> => {

	const dmChannel: DMChannel = await getDMChannel(member, dmChan);

	const verificationMessage = await dmChannel.send({ content:
			'Hello! Welcome to BanklessDAO. We\'re glad you\'re here 🙂 \n \n' +
			'Before we start you have to prove that you are human by reacting with 👍 ' });

	await verificationMessage.react('👍');

	await verificationMessage.awaitReactions({
		max: 1,
		time: (5000 * 60),
		errors: ['time'],
		filter: async (reaction, user) => {
			return ['👍'].includes(reaction.emoji.name) && !user.bot;
		},
	})
		.then(async () => {
			await switchRoles(member, constants.FIRST_QUEST_ROLES.unverified, constants.FIRST_QUEST_ROLES.verified);

			await dmChannel.send({ content:'Verification successful!\n\n' });

			await sendFqMessage(dmChannel, member);
		})
		.catch(async (e) => {
			await dmChannel.send('Verification failed, please try again. You can restart ' +
										'the verification process by responding with **!verification** ');
			Log.error(e);
		});
};

export const sendFqMessage = async (dmChannel: TextBasedChannels, member: GuildMember ): Promise<void> => {

	if (messagesState.length === 0) {
		await getMessageContentFromDb();
	}

	const fqMessageContent = messagesState[0];

	const fqMessage = retrieveFqMessage(member);

	const content = fqMessageContent[fqMessage.message_id];

	const firstQuestMessage = await dmChannel.send({ content: content.replace(/\\n/g, '\n') });

	await firstQuestMessage.react(fqMessage.emoji);

	const filter = (reaction, user) => {
		return [fqMessage.emoji].includes(reaction.emoji.name) && !user.bot;
	};

	const collector = firstQuestMessage.createReactionCollector({ filter, max: 1, time: (20000*60), dispose: true });

	collector.on('end', async (collected, reason) => {

		if (reason === 'limit') {
			await switchRoles(member, fqMessage.start_role, fqMessage.end_role);
			try {
				if (!(fqMessage.end_role === constants.FIRST_QUEST_ROLES.first_quest_complete)) {
					await sendFqMessage(dmChannel, member);

				} else {
					await dmChannel.send({ content: fqMessageContent[getFqMessage(constants.FIRST_QUEST_ROLES.first_quest_complete).message_id].replace(/\\n/g, '\n') });
				}
			} catch {
				//give some time for the role update to come through and try again
				await new Promise(r => setTimeout(r, 1000));

				if (!(fqMessage.end_role === constants.FIRST_QUEST_ROLES.first_quest_complete)) {
					await sendFqMessage(dmChannel, member);

				} else {
					await dmChannel.send({ content: fqMessageContent[getFqMessage(constants.FIRST_QUEST_ROLES.first_quest_complete).message_id].replace(/\\n/g, '\n') });
				}
			}
			return;
		}

		// if firstQuestMessage is not the last message,
		// time out silently (user probably invoked !first-quest).
		// Otherwise, send time out notification.
		if (firstQuestMessage.id === dmChannel.lastMessage.id) {
			await dmChannel.send('The conversation timed out. ' +
				'All your progress has been saved. ' +
				'You can continue at any time by ' +
				'responding to this conversation ' +
				'with **!first-quest** ');
		}

		if (!['limit', 'time'].includes(reason)){
			Log.debug(`First Quest reaction collector stopped for unknown reason: ${reason}`);
		}
	});
};

const fqRescueCall = async () => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestTracker = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

	const data = await firstQuestTracker.find({}).toArray();

	console.log('FQ tracker is here: ', data);
	for (const fqUser of data) {
		if (!(fqUser.role === constants.FIRST_QUEST_ROLES.first_quest_complete) && (fqUser.doneRescueCall === false)){
			console.log('we have a winner, with role ', fqUser.role)

			if ((+new Date() - fqUser.timestamp) >= (1000*60*60*24)) {
				console.log('To the rescue my friend ', fqUser._id);

				const filter = { _id: fqUser._id };

				const options = { upsert: false };

				const updateDoc = { $set: { doneRescueCall: true } };

				await firstQuestTracker.updateOne(filter, updateDoc, options);

				const supportChannel = await client.guilds.fetch()

				for (const oAuth2Guild of supportChannel.values()) {
					const guild = await oAuth2Guild.fetch();

					if (guild.id === fqUser.guild) {
						const channels = await guild.channels.fetch();

						const supportChannel = channels.get(process.env.DISCORD_CHANNEL_SUPPORT_ID) as TextBasedChannels ;

						await supportChannel.send({ content: `User <@${fqUser._id}> appears to be stuck in first-quest, please extend some help.` })
					}
				}
			}
		}
	}
};

const messagesState = [];

const getMessageContentFromDb = async (): Promise<void> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestContent = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT).find({});

	const data = await firstQuestContent.toArray();

	messagesState.push(data[0].messages);
}

const getDMChannel = async (member: GuildMember, dmChan: TextBasedChannels | string): Promise<DMChannel> => {
	if (dmChan === 'undefined') {
		return await member.user.createDM();

	} else {
		return dmChan as DMChannel;
	}
}

export const firstQuestHandleUserRemove = async (member: GuildMember): Promise<void> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestTracker = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

	try {
		await firstQuestTracker.deleteOne( { _id: member.user.id } );
	} catch {
		Log.error(`First Quest: Could not remove user ${member.user} from firstQuestTracker collection`);
	}
};

export const switchRoles = async (member: GuildMember, fromRole: string, toRole: string): Promise<void> => {
	const guild = member.guild;

	const roles = await guild.roles.fetch();

	for (const role of roles.values()) {
		if (role.name === toRole) {
			await member.roles.add(role);

			const filter = { _id: member.user.id };

			const options = { upsert: true };

			const updateDoc = { $set: { role: role.name, doneRescueCall: false, timestamp: Date.now(), guild: guild.id } };

			const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

			const dbFirstQuestTracker = db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

			await dbFirstQuestTracker.updateOne(filter, updateDoc, options);
		}

		if (role.name === fromRole) {
			await member.roles.remove(role);
		}
	}
};

const retrieveFqMessage = (member) => {

	const roles = member.roles.cache;

	for (const role of roles.values()) {
		if (Object.values(constants.FIRST_QUEST_ROLES).indexOf(role.name) > -1) {
			return getFqMessage(role.name);
		}
	}
};

const getFqMessage = (roleName: string) => {
	switch (roleName) {
	case (constants.FIRST_QUEST_ROLES.verified):
		return fqMessageFlow['verified'];
	case (constants.FIRST_QUEST_ROLES.first_quest_welcome):
		return fqMessageFlow['welcome'];
	case (constants.FIRST_QUEST_ROLES.first_quest_membership):
		return fqMessageFlow['membership'];
	case (constants.FIRST_QUEST_ROLES.firehose):
		return fqMessageFlow['firehose'];
	case (constants.FIRST_QUEST_ROLES.first_quest_scholar):
		return fqMessageFlow['scholar'];
	case (constants.FIRST_QUEST_ROLES.first_quest_guest_pass):
		return fqMessageFlow['guest_pass'];
	case (constants.FIRST_QUEST_ROLES.first_quest):
		return fqMessageFlow['first_quest'];
	case (constants.FIRST_QUEST_ROLES.first_quest_complete):
		return fqMessageFlow['complete'];
	}
};

const fqMessageFlow = {
	verified: {
		message_id: 'fq1',
		emoji: '🏦',
		start_role: constants.FIRST_QUEST_ROLES.verified,
		end_role: constants.FIRST_QUEST_ROLES.first_quest_welcome,
	},
	welcome: {
		message_id: 'fq2',
		emoji: '🏦',
		start_role: constants.FIRST_QUEST_ROLES.first_quest_welcome,
		end_role: constants.FIRST_QUEST_ROLES.first_quest_membership,
	},
	membership: {
		message_id: 'fq3',
		emoji: '🏦',
		start_role: constants.FIRST_QUEST_ROLES.first_quest_membership,
		end_role: constants.FIRST_QUEST_ROLES.firehose,
	},
	firehose: {
		message_id: 'fq4',
		emoji: '✏️',
		start_role: constants.FIRST_QUEST_ROLES.firehose,
		end_role: constants.FIRST_QUEST_ROLES.first_quest_scholar,
	},
	scholar: {
		message_id: 'fq5',
		emoji: '✏️',
		start_role: constants.FIRST_QUEST_ROLES.first_quest_scholar,
		end_role: constants.FIRST_QUEST_ROLES.first_quest_guest_pass,
	},
	guest_pass: {
		message_id: 'fq6',
		emoji: '✏️',
		start_role: constants.FIRST_QUEST_ROLES.first_quest_guest_pass,
		end_role: constants.FIRST_QUEST_ROLES.first_quest,
	},
	first_quest: {
		message_id: 'fq7',
		emoji: '🤠',
		start_role: constants.FIRST_QUEST_ROLES.first_quest,
		end_role: constants.FIRST_QUEST_ROLES.first_quest_complete,
	},
	complete: {
		message_id: 'fq8',
		emoji: '',
		start_role: constants.FIRST_QUEST_ROLES.first_quest_complete,
		end_role: constants.FIRST_QUEST_ROLES.verified,
	},
};
