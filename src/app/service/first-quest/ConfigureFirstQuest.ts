import { DMChannel, GuildMember, TextBasedChannels } from 'discord.js';
import { CommandContext } from 'slash-create';
import { Db, ObjectID } from 'mongodb';
import dbInstance from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import fqConstants from '../constants/firstQuest';
import Log from '../../utils/Log';
import channelIds from '../constants/channelIds';
import roleIds from '../constants/roleIds';

export default async (member: GuildMember, ctx?: CommandContext): Promise<any> => {
	ctx?.send(`Hi, ${ctx.user.mention}! I sent you a DM with more information.`);

	const dmChannel = await member.user.createDM();

	await dmChannel.send({ content: 'Which message would you like to edit?' });

	await createSelectMessage(dmChannel, member);

};

const createSelectMessage = async (dmChannel, member): Promise<void> => {

	const data = await fetchData();

	const embed = await createEmbed(data);

	const selectMessage = await dmChannel.send({ embeds: [embed] });

	for (let i = 0; i < embed.fields.length; i++) {
		await selectMessage.react(constants.EMOJIS[(i + 1).toString()]);
	}

	const emojiArray = createEmojiArray(embed.fields.length);

	const filter = (reaction, user) => {
		return emojiArray.includes(reaction.emoji.name) && !user.bot;
	};

	const collector = selectMessage.createReactionCollector({ filter, max: 1, time: (7000 * 60), dispose: true });

	collector.on('end', async (collected, reason) => {
		if (reason === 'limit') {
			for (const reac of collected.values()) {
				const users = await reac.users.fetch();

				if (users.has(member.user.id)) {
					const key = 'fq' + reac.emoji.name.slice(0, 1);

					const selectedContent = data[0].messages[key].replace(/\\n/g, '\n');

					await dmChannel.send({ content: selectedContent });

					const confirmationMessage = await dmChannel.send({ content:
							'\n\n**Please confirm your selection:** \n\n' +
							'👍 - Replace this content with new content \n' +
							'🔃 - Change selection \n' +
							'❌ - Cancel',
					});

					await confirmationMessage.react('👍');
					await confirmationMessage.react('🔃');
					await confirmationMessage.react('❌');

					await collectConfirmation(confirmationMessage, member, key, data[0].messages);
				}
			}
		} else {
			await dmChannel.send({ content: 'Command timed out.' });
		}
	});
};

const collectConfirmation = async (message, member, key, origMessages): Promise<void> => {

	const filter = (reaction, user) => {
		return ['👍', '🔃', '❌'].includes(reaction.emoji.name) && !user.bot;
	};

	const collector = message.createReactionCollector({ filter, max: 1, time: (7000 * 60), dispose: true });

	collector.on('end', async (collected, reason) => {
		if (reason === 'limit') {
			for (const reac of collected.values()) {
				const users = await reac.users.fetch();

				if (users.has(member.user.id)) {
					if (reac.emoji.name === '👍') {
						await collectUserInput(message.channel, member, key, origMessages);

						return;
					} else if (reac.emoji.name === '🔃') {
						await createSelectMessage(message.channel, member);

						return;
					} else if (reac.emoji.name === '❌') {
						await message.channel.send({ content: 'Command cancelled.' });
					}
				}
			}
		} else {
			await message.channel.send({ content: 'Command timed out.' });
		}
	});
};

const collectUserInput = async (dmChannel: DMChannel, member: GuildMember, key: string, origMessages: Record<string, string>): Promise<void> => {

	await dmChannel.send({ content: '**Your input please:** \n(Go here for guidance on how to format your message ' +
			'<https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline->)' });

	const responseContent = (await dmChannel.awaitMessages({ max: 1, time: (30000 * 60), errors: ['time'] })).first().content;

	const finalConfirmation = await dmChannel.send({ content: '👍 - Confirm and exit \n➡️ - Confirm and select another \n❌ - Cancel' });

	await finalConfirmation.react('👍');
	await finalConfirmation.react('➡️');
	await finalConfirmation.react('❌');

	const filter = (reaction, user) => {
		return ['👍', '➡️', '❌'].includes(reaction.emoji.name) && !user.bot;
	};

	const collector = finalConfirmation.createReactionCollector({ filter, max: 1, time: (7000 * 60), dispose: true });

	collector.on('end', async (collected, reason) => {
		if (reason === 'limit') {
			for (const reac of collected.values()) {
				const users = await reac.users.fetch();

				if (users.has(member.user.id)) {
					if (reac.emoji.name === '👍') {
						const dbResponse = await updateDatabase(member, responseContent, key, origMessages);

						await dmChannel.send({ content: `Database update complete. Status: ${dbResponse}` });

						return;
					} else if (reac.emoji.name === '➡️') {

						const dbResponse = await updateDatabase(member, responseContent, key, origMessages);

						await dmChannel.send({ content: dbResponse });

						await createSelectMessage(dmChannel, member);

						return;
					} else if (reac.emoji.name === '❌') {
						await dmChannel.send({ content: 'Command cancelled.' });
					}
				}
			}
		} else {
			await dmChannel.send({ content: 'Command timed out.' });
		}
	});
};

const updateDatabase = async (member, content, key, origMessages) => {

	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const timestamp = Date.now();

	const logMeta = {
		origContent: origMessages[key],
		newContent: content,
		messageKey: key,
		updatedBy: member.user.id,
		timestamp: timestamp,
	};

	const opts = {
		level: 'info',
		meta: logMeta,
	};

	const firstQuestContent = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT);

	const filter = { _id: ObjectID(fqConstants.FIRST_QUEST_DB_DOCUMENT_ID) };

	const options = { upsert: false };

	origMessages[key] = content;

	const updateDoc = { $set: { messages: origMessages, last_updated: timestamp } };

	const update = await firstQuestContent.updateOne(filter, updateDoc, options);

	Log.info('First Quest message content updated', opts);

	const channels = await member.guild.channels.fetch();

	const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

	// This has to be split up into separate messages to not exceed 2000 character limit of discord

	await fqProjectChannel.send({ content: `<@&${ roleIds.firstQuestProject }> : First Quest message content was updated by user ${ member.user.username } with user id: ${ member.user.id } ` });

	await fqProjectChannel.send({ content: '**Original message:**' });

	await fqProjectChannel.send({ content: logMeta.origContent });

	await fqProjectChannel.send({ content: '**New message:**' });

	await fqProjectChannel.send({ content: logMeta.newContent });

	return (update.result.ok && update.result.nModified) ? 'Message updated successfully' : 'Could not update message, please try again';
};

const fetchData = async () => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestContent = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT).find({});

	return await firstQuestContent.toArray();
};

const createEmbed = async (data) => {

	const embed = {
		title: 'Overview of current message content',
		fields: [],
		footer: { text: 'select emote to edit corresponding question' },
	};

	for (const [index, [, value]] of Object.entries(Object.entries(data[0].messages as Record<string, string>))) {
		// eslint-disable-next-line
		const regexUrl = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm;

		embed.fields.push({
			name: `Message ${constants.EMOJIS[(parseInt(index) + 1).toString()]}`,
			value: value.replace(regexUrl, 'URL REMOVED').replace(/\\n/g, '\n').slice(0, 200) + '...',
		});
	}

	return embed;
};

const createEmojiArray = (len) => {
	const emojiArray = [];

	for (let i = 0; i < len; i++) {
		emojiArray.push(constants.EMOJIS[(i + 1).toString()]);
	}

	return emojiArray;
};