import { DMChannel, GuildMember, TextBasedChannels } from 'discord.js';
import constants from '../constants/constants';
import fqConstants from '../constants/firstQuest';
import Log from '../../utils/Log';
import dbInstance from '../../utils/MongoDbUtils';
import { Db } from 'mongodb';
import client from '../../app';
import channelIds from '../constants/channelIds';
import { getPOAPLink } from './FirstQuestPOAP';

export const sendFqMessage = async (dmChan:TextBasedChannels | string, member: GuildMember): Promise<void> => {

	const dmChannel: DMChannel = await getDMChannel(member, dmChan);

	const fqMessageContent = await getMessageContentFromDb();

	const fqMessage = retrieveFqMessage(member);

	const content = fqMessageContent[fqMessage.message_id];

	const firstQuestMessage = await dmChannel.send({ content: content.replace(/\\n/g, '\n') });

	await firstQuestMessage.react(fqMessage.emoji);

	const filter = (reaction, user) => {
		return [fqMessage.emoji].includes(reaction.emoji.name) && !user.bot;
	};

	const collector = firstQuestMessage.createReactionCollector({ filter, max: 1, time: (20000 * 60), dispose: true });

	collector.on('end', async (collected, reason) => {

		if (reason === 'limit') {
			await switchRoles(member, fqMessage.start_role, fqMessage.end_role);
			try {
				if (!(fqMessage.end_role === fqConstants.FIRST_QUEST_ROLES.first_quest_complete)) {
					await sendFqMessage(dmChannel, member);

				} else {
					await dmChannel.send({ content: fqMessageContent[getFqMessage(fqConstants.FIRST_QUEST_ROLES.first_quest_complete).message_id].replace(/\\n/g, '\n') });

					await getPOAPLink(member);
				}
			} catch {
				// give some time for the role update to come through and try again
				await new Promise(r => setTimeout(r, 1000));

				if (!(fqMessage.end_role === fqConstants.FIRST_QUEST_ROLES.first_quest_complete)) {
					await sendFqMessage(dmChannel, member);

				} else {
					await dmChannel.send({ content: fqMessageContent[getFqMessage(fqConstants.FIRST_QUEST_ROLES.first_quest_complete).message_id].replace(/\\n/g, '\n') });

					await getPOAPLink(member);
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

		if (!['limit', 'time'].includes(reason)) {
			Log.debug(`First Quest reaction collector stopped for unknown reason: ${reason}`);
		}
	});
};

export const fqRescueCall = async (): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestTracker = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

	const data = await firstQuestTracker.find({}).toArray();

	for (const fqUser of data) {
		if (!(fqUser.role === fqConstants.FIRST_QUEST_ROLES.first_quest_complete) && (fqUser.doneRescueCall === false)) {

			if ((+new Date() - fqUser.timestamp) >= (1000 * 60 * 60 * 24)) {

				const filter = { _id: fqUser._id };

				const options = { upsert: false };

				const updateDoc = { $set: { doneRescueCall: true } };

				await firstQuestTracker.updateOne(filter, updateDoc, options);

				const guilds = await client.guilds.fetch();

				for (const oAuth2Guild of guilds.values()) {
					const guild = await oAuth2Guild.fetch();

					if (guild.id === fqUser.guild) {
						const channels = await guild.channels.fetch();

						const supportChannel = channels.get(channelIds.generalSupport) as TextBasedChannels;

						await supportChannel.send({ content: `User <@${fqUser._id}> appears to be stuck in first-quest, please extend some help.` });
					}
				}
			}
		}
	}
};

const getMessageContentFromDb = async (): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestContent = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT).find({});

	const data = await firstQuestContent.toArray();

	return data[0].messages;
};

const getDMChannel = async (member: GuildMember, dmChan: TextBasedChannels | string): Promise<DMChannel> => {
	if (dmChan === 'undefined') {
		return await member.user.createDM();

	} else {
		return dmChan as DMChannel;
	}
};

export const firstQuestHandleUserRemove = async (member: GuildMember): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestTracker = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

	try {
		await firstQuestTracker.deleteOne({ _id: member.user.id });
	} catch {
		Log.error(`First Quest: Could not remove user ${member.user} from firstQuestTracker collection`);
	}
};

export const switchRoles = async (member: GuildMember, fromRole: string, toRole: string): Promise<void> => {
	const guild = member.guild;

	const roles = await guild.roles.fetch();

	for (const role of roles.values()) {
		if (role.id === toRole) {
			await member.roles.add(role);

			const filter = { _id: member.user.id };

			const options = { upsert: true };

			const updateDoc = { $set: { role: role.id, doneRescueCall: false, timestamp: Date.now(), guild: guild.id } };

			const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

			const dbFirstQuestTracker = db.collection(constants.DB_COLLECTION_FIRST_QUEST_TRACKER);

			await dbFirstQuestTracker.updateOne(filter, updateDoc, options);
		}

		if (role.id === fromRole) {
			await member.roles.remove(role);
		}
	}
};

const retrieveFqMessage = (member) => {

	const roles = member.roles.cache;

	for (const role of roles.values()) {
		if (Object.values(fqConstants.FIRST_QUEST_ROLES).indexOf(role.id) > -1) {
			return getFqMessage(role.id);
		}
	}
};

const getFqMessage = (roleId: string) => {
	switch (roleId) {
	case (fqConstants.FIRST_QUEST_ROLES.verified):
		return fqMessageFlow['verified'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest_welcome):
		return fqMessageFlow['welcome'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest_membership):
		return fqMessageFlow['membership'];
	case (fqConstants.FIRST_QUEST_ROLES.firehose):
		return fqMessageFlow['firehose'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest_scholar):
		return fqMessageFlow['scholar'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest_guest_pass):
		return fqMessageFlow['guest_pass'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest):
		return fqMessageFlow['first_quest'];
	case (fqConstants.FIRST_QUEST_ROLES.first_quest_complete):
		return fqMessageFlow['complete'];
	}
};

const fqMessageFlow = {
	verified: {
		message_id: 'fq1',
		emoji: '🏦',
		start_role: fqConstants.FIRST_QUEST_ROLES.verified,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest_welcome,
	},
	welcome: {
		message_id: 'fq2',
		emoji: '🏦',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest_welcome,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest_membership,
	},
	membership: {
		message_id: 'fq3',
		emoji: '🏦',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest_membership,
		end_role: fqConstants.FIRST_QUEST_ROLES.firehose,
	},
	firehose: {
		message_id: 'fq4',
		emoji: '✏️',
		start_role: fqConstants.FIRST_QUEST_ROLES.firehose,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest_scholar,
	},
	scholar: {
		message_id: 'fq5',
		emoji: '✏️',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest_scholar,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest_guest_pass,
	},
	guest_pass: {
		message_id: 'fq6',
		emoji: '✏️',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest_guest_pass,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest,
	},
	first_quest: {
		message_id: 'fq7',
		emoji: '🤠',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest,
		end_role: fqConstants.FIRST_QUEST_ROLES.first_quest_complete,
	},
	complete: {
		message_id: 'fq8',
		emoji: '',
		start_role: fqConstants.FIRST_QUEST_ROLES.first_quest_complete,
		end_role: fqConstants.FIRST_QUEST_ROLES.verified,
	},
};
