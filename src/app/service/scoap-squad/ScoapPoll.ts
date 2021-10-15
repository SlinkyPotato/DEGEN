import { Message, TextChannel, MessageReaction, ReactionCollector } from 'discord.js';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import constants from '../constants/constants';
import scoapSquadNotion from '../constants/scoapSquadNotion';
import { Vote, VoteRecord, ScoapEmbed } from './ScoapClasses';
import { scoapEmbedState, voteRecordState, botConvoState } from './ScoapDatabase';
import ScoapUtils from '../../utils/ScoapUtils';
import { updateScoapOnNotion, updateStatusSelectField } from './ScoapNotion';
import { updateScoapEmbedAndVoteRecordDb, deleteScoapEmbedAndVoteRecord } from './ScoapDatabase';
import Log, { LogUtils } from '../../utils/Log';


export default async (channel: TextChannel, scoapEmbed: ScoapEmbed): Promise<any> => {

	const validEmojiArray = cloneDeep(scoapEmbed.getVotableEmojiArray());
	validEmojiArray.push(constants.EMOJIS.cross_mark);

	const emoteRequired = {};
	const emoteTotals = {};
	const progressStrings = {};
	Array(scoapEmbed.getBotConvoResponseRecord().number_of_roles).fill(0).map((_, i) => {
		const role = scoapEmbed.getBotConvoResponseRecord().roles[(i + 1).toString()];
		const emoji = constants.EMOJIS[(i + 1).toString()];
		emoteRequired[emoji] = parseInt(role.role_count);
		emoteTotals[emoji] = 0;
		progressStrings[emoji] = `0%(0/${role.role_count})`;
	});

	const voteRecord = new VoteRecord()
		.setUserVoteLedger({})
		.setEmoteRequired(emoteRequired)
		.setEmoteTotals(emoteTotals)
		.setProgressStrings(progressStrings);
	voteRecordState[scoapEmbed.getId()] = voteRecord;
	ScoapUtils.logToFile('object added to voteRecordState. Reason: new VoteRecord \n ' +
							` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	const embedMessage = await channel.send({ embeds: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentChannel(channel).setCurrentMessage(embedMessage);
	scoapEmbed.setPublishedTimestamp(+new Date());

	await updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);

	for (const item of validEmojiArray) {
		await embedMessage.react(item);
	}

	const collector = createReactionCollector(embedMessage, validEmojiArray, constants.SCOAP_POLL_TIMEOUT_MS);
	await collectReactions(scoapEmbed, voteRecord, validEmojiArray, collector);
	return;
};

export const createReactionCollector = (embedMessage: Message, validEmojiArray: Array<string>, timeout: number): ReactionCollector => {
	const filter = (reaction, user) => {
		const emojiIsValid = emojiValid(reaction.emoji.name, validEmojiArray);
		const botReaction = user.bot;
		return (emojiIsValid && (!botReaction));
	};

	const collector = embedMessage.createReactionCollector({
		filter,
		dispose: true,
		time: timeout,
	});

	return collector;
};

export const collectReactions = async (scoapEmbed: ScoapEmbed, voteRecord: VoteRecord, validEmojiArray: Array<string>, collector: ReactionCollector): Promise<any> => {

	const embedMessage = scoapEmbed.getCurrentMessage() as Message;

	collector.on('collect', async (reaction, user) => {

		const choiceValid = validateChoice(
			reaction.emoji.name,
			voteRecord.getEmoteTotals(),
			voteRecord.getEmoteRequired(),
		);

		if (reaction.emoji.name === '❌') {
			return handleDeletePoll(user, scoapEmbed, embedMessage, collector);

		} else if (emojiValid(reaction.emoji.name, scoapEmbed.getVotableEmojiArray())) {
			
			switch (true) {
			case choiceValid === true: {

				const vote = new Vote(
					user.id,
					reaction.emoji.name,
					voteRecord.getUserVoteLedger(),
				);
				voteRecord.update(vote);
				Log.debug(`received vote from user: ${user.tag} ${reaction.emoji.name}`);
				Log.debug(voteRecord.getUserVoteLedger());


				if (vote.getType() === 'CHANGEVOTE') {
					await removeReaction(
						collector.collected,
						vote.getUserId(),
						vote.getEmoji(),
						choiceValid,
						scoapEmbed,
					);
				}

				for (const key in voteRecord.getProgressStrings()) {
					scoapEmbed.updateProgressString(
						key,
						voteRecord.getProgressStrings()[key],
					);
				}
				await embedMessage.edit({ embeds: scoapEmbed.getEmbed() });

				scoapEmbed.addReactionUserId(reaction.emoji.name, user.id);
				ScoapUtils.logToFile('voteRecord & scoapEmbed updated. Reason: Vote event \n' +
							` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							` voteRecordState: ${JSON.stringify(voteRecordState)}`);
				await updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);

				if (isEqual(voteRecord.getEmoteTotals(), voteRecord.getEmoteRequired())) {
					collector.stop();
				}

				break;
			}
			case choiceValid === false: {
				await removeReaction(
					reaction,
					user.id,
					reaction.emoji.name,
					choiceValid,
					scoapEmbed,
				);
				break;
			}
			}
		}
	});

	collector.on('end', async (collected, reason) => {
		if (reason === 'cancelled') {
			await embedMessage.reactions.removeAll();
			return;
		}
		const discordTags = [];
		const roleSummary = {};
		for (const reaction of collected.values()) {
			for (const user of reaction.users.cache) {
				if (!user[1].bot) {
					const userResponseRecordKey = ScoapUtils.getKeyByValue(constants.EMOJIS, reaction.emoji.name);
					const role = scoapEmbed.getBotConvoResponseRecord().roles[userResponseRecordKey];
					discordTags.push(user[1].tag);
					if (!(role.name in roleSummary)) {
						roleSummary[role.name] = [user[1].tag];
					} else {
						roleSummary[role.name].push(user[1].tag);
					}
					const dmChannel = await user[1].createDM();
					await dmChannel.send('Congratulations, you are part of the SCOAP Squad ' +
									`**${scoapEmbed.getBotConvoResponseRecord().embed[0].title}** ` +
									`for role **${role.name}**! Check out the project page here: ` +
									`https://www.notion.so/${process.env.NOTION_SCOAP_SQUAD_DB_ID}`);
				}
			}
		}
		let roleSummaryString = 'Role Summary: \n';
		for (const property in roleSummary) {
			roleSummaryString += property + '\n' + roleSummary[property].toString() + '\n';
		}
		const notionInputs = {
			discord_tags: discordTags,
			summary: roleSummaryString,
		};
		Log.debug(`NOTION PAGE ID ${scoapEmbed.getNotionPageId()}`);
		await updateScoapOnNotion(scoapEmbed.getNotionPageId(), notionInputs);
		delete scoapEmbedState[scoapEmbed.getId()];
		delete voteRecordState[scoapEmbed.getId()];
		ScoapUtils.logToFile('object deleted from botConvoState & voteRecordState. Reason: Poll End event \n' +
							` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							` voteRecordState: ${JSON.stringify(voteRecordState)}`);
		await deleteScoapEmbedAndVoteRecord(scoapEmbed.getId());
		Log.debug('POLL COMPLETE');
		await embedMessage.reactions.removeAll();
		return;
	});

	collector.on('remove', async (reaction, user) => {
		const vote = new Vote(
			user.id,
			reaction.emoji.name,
			voteRecord.getUserVoteLedger(),
		);
		if (vote.getType() === 'UNVOTE') {
			voteRecord.update(vote);
			Log.debug(`removed vote from user: ${user.id} reaction.emoji.name`);
			Log.debug(voteRecord.getUserVoteLedger());
			for (const key in voteRecord.getProgressStrings()) {
				scoapEmbed.updateProgressString(
					key,
					voteRecord.getProgressStrings()[key],
				);
			}
			await embedMessage.edit({ embeds: scoapEmbed.getEmbed() });
			scoapEmbed.removeReactionUserId(reaction.emoji.name, user.id);
			await updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);
		}
	});
};

const handleDeletePoll = async (user, scoapEmbed, embedMessage, collector) => {
	if (user.id === scoapEmbed.getAuthor().id) {
		const dmChannel = await user.createDM();
		const embedSample = cloneDeep(scoapEmbed.getEmbed());
		embedSample[0].footer = { text: '👍 - yes, delete | ❌ - cancel' };
		const deleteConfirmMessage = await dmChannel.send({ content: 'you are about to delete the folowing SCOAP Squad Assemble: ', embeds: embedSample });
		await deleteConfirmMessage.react('👍');
		await deleteConfirmMessage.react('❌');
		deleteConfirmMessage.awaitReactions({
			max: 1,
			time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
			errors: ['time'],
			filter: async (delReaction, usr) => {
				return ['👍', '❌'].includes(delReaction.emoji.name) && !usr.bot;
			},
		}).then(async collected => {
			const delReaction: MessageReaction = collected.first();
			if (delReaction.emoji.name === '👍') {
				delete scoapEmbedState[scoapEmbed.getId()];
				delete voteRecordState[scoapEmbed.getId()];
				await updateStatusSelectField(scoapEmbed.getNotionPageId(), scoapSquadNotion.SCOAP_SQUAD_NOTION_FIELDS.status.categories.cancelled);
				ScoapUtils.logToFile('object deleted from botConvoState & voteRecordState. Reason: Delete Poll \n' +
							`scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							`botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							`voteRecordState: ${JSON.stringify(voteRecordState)}`);
				await deleteScoapEmbedAndVoteRecord(scoapEmbed.getId());
				await embedMessage.edit({ embeds: [{ title: 'Scoap Squad cancelled' }] });
				collector.stop('cancelled');
				await dmChannel.send({ content: 'ScoapSquad Assemble cancelled. ' });
			} else if (delReaction.emoji.name === '❌') {
				return;
			}
		}).catch(e => {
			LogUtils.logError('did not react', e);
		});
	}
	return;
};

const removeReaction = async (collected, userId, emoji, choiceValid, scoapEmbed) => {
	try {
		for (const reac of collected.values()) {
			if (choiceValid === true) {
				if (reac.emoji.name !== emoji) {
					await reac.users.remove(userId);
					scoapEmbed.removeReactionUserId(reac.emoji.name, userId);
				}
			} else if (choiceValid === false) {
				if (reac.emoji.name === emoji) {
					await reac.users.remove(userId);
					scoapEmbed.removeReactionUserId(reac.emoji.name, userId);
				}
			}
		}
	} catch (error) {
		LogUtils.logError('failed to remove reactions', error);
	}
};

const emojiValid = (emoji, validEmojiArray) => {
	return validEmojiArray.includes(emoji);
};

const validateChoice = (emoji, totals, required) => {
	if (totals[emoji] < required[emoji]) {
		return true;
	} else {
		return false;
	}
};

