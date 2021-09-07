import { TextChannel, MessageReaction } from 'discord.js';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import constants from '../constants/constants';
import { Vote, VoteRecord } from './ScoapClasses';
import { scoapEmbedState, voteRecordState, botConvoState } from './ScoapDatabase';
import ScoapUtils from '../../utils/ScoapUtils';
import { updateScoapOnNotion, updateStatusSelectField } from './ScoapNotion';
import { updateScoapEmbedAndVoteRecordDb, deleteScoapEmbedAndVoteRecord } from './ScoapDatabase';


export default async (channel: TextChannel, scoapEmbed: any): Promise<any> => {

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

	updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);

	for (const item of validEmojiArray) {
		await embedMessage.react(item);
	}

	const collector = createReactionCollector(embedMessage, validEmojiArray, constants.SCOAP_POLL_TIMEOUT_MS);
	collectReactions(scoapEmbed, voteRecord, validEmojiArray, collector);
	return;
};

export const createReactionCollector = (embedMessage, validEmojiArray, timeout) => {
	const filter = (reaction, user) => {
		const emoji_valid = emojiValid(reaction.emoji.name, validEmojiArray);
		const bot_reaction = user.bot;
		return (emoji_valid && (!bot_reaction));
	};

	const collector = embedMessage.createReactionCollector({
		filter,
		dispose: true,
		time: timeout,
	});

	return collector;
};

export const collectReactions = async (scoapEmbed, voteRecord, validEmojiArray, collector) => {

	const embedMessage = scoapEmbed.getCurrentMessage();

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
				console.log('received vote from user: ', user.tag, ' ', reaction.emoji.name);
				console.log(voteRecord.getUserVoteLedger());


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
				embedMessage.edit({ embeds: scoapEmbed.getEmbed() });

				scoapEmbed.addReactionUserId(reaction.emoji.name, user.id);
				ScoapUtils.logToFile('voteRecord & scoapEmbed updated. Reason: Vote event \n' +
							` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							` voteRecordState: ${JSON.stringify(voteRecordState)}`);
				updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);

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
			embedMessage.reactions.removeAll();
			return;
		}
		const discord_tags = [];
		const role_summary = {};
		for (const reaction of collected.values()) {
			for (const user of reaction.users.cache) {
				if (!user[1].bot) {
					const user_response_record_key = ScoapUtils.getKeyByValue(constants.EMOJIS, reaction.emoji.name);
					const role = scoapEmbed.getBotConvoResponseRecord().roles[user_response_record_key];
					discord_tags.push(user[1].tag);
					if (!(role.name in role_summary)) {
						role_summary[role.name] = [user[1].tag];
					} else {
						role_summary[role.name].push(user[1].tag);
					}
					const dm_channel = await user[1].createDM();
					dm_channel.send(`Congratulations, you are part of the SCOAP Squad for role ${role.name}!`);
				}
			}
		}
		let role_summary_string = 'Role Summary: \n';
		for (const property in role_summary) {
			role_summary_string += property + '\n' + role_summary[property].toString() + '\n';
		};
		const notion_inputs = {
			discord_tags: discord_tags,
			summary: role_summary_string,
		};
		await updateScoapOnNotion(scoapEmbed.getNotionPageId(), notion_inputs);
		delete scoapEmbedState[scoapEmbed.getId()];
		delete voteRecordState[scoapEmbed.getId()];
		ScoapUtils.logToFile('object deleted from botConvoState & voteRecordState. Reason: Poll End event \n' +
							` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							` voteRecordState: ${JSON.stringify(voteRecordState)}`);
		deleteScoapEmbedAndVoteRecord(scoapEmbed.getId());
		console.log('POLL COMPLETE');
		embedMessage.reactions.removeAll();
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
			console.log('removed vote from user: ', user.id, ' ', reaction.emoji.name);
			console.log(voteRecord.getUserVoteLedger());
			for (const key in voteRecord.getProgressStrings()) {
				scoapEmbed.updateProgressString(
					key,
					voteRecord.getProgressStrings()[key],
				);
			}
			embedMessage.edit({ embeds: scoapEmbed.getEmbed() });
			scoapEmbed.removeReactionUserId(reaction.emoji.name, user.id);
			updateScoapEmbedAndVoteRecordDb(scoapEmbed, voteRecord);
		}
	});
};

const handleDeletePoll = async (user, scoapEmbed, embedMessage, collector) => {
	if (user.id === scoapEmbed.getAuthor().id) {
		const dm_channel = await user.createDM();
		const embed_sample = cloneDeep(scoapEmbed.getEmbed());
		embed_sample[0].footer = { text: '👍 - yes, delete | ❌ - cancel' };
		const delete_confirm_message = await dm_channel.send({ content: 'you are about to delete the folowing SCOAP Squad Assemble: ', embeds: embed_sample });
		await delete_confirm_message.react('👍');
		await delete_confirm_message.react('❌');
		delete_confirm_message.awaitReactions({
			max: 1,
			time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
			errors: ['time'],
			filter: async (del_reaction, usr) => {
				return ['👍', '❌'].includes(del_reaction.emoji.name) && !usr.bot;
			},
		}).then(async collected => {
			const del_reaction: MessageReaction = collected.first();
			if (del_reaction.emoji.name === '👍') {
				delete scoapEmbedState[scoapEmbed.getId()];
				delete voteRecordState[scoapEmbed.getId()];
				await updateStatusSelectField(scoapEmbed.getNotionPageId(), constants.SCOAP_SQUAD_NOTION_FIELDS.status.categories.cancelled);
				ScoapUtils.logToFile('object deleted from botConvoState & voteRecordState. Reason: Delete Poll \n' +
							`scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
							`botConvoState: ${JSON.stringify(botConvoState)}  \n` +
							`voteRecordState: ${JSON.stringify(voteRecordState)}`);
				deleteScoapEmbedAndVoteRecord(scoapEmbed.getId());
				await embedMessage.edit({ embeds: [{ title: 'Scoap Squad cancelled' }] });
				collector.stop('cancelled');
				await dm_channel.send({ content: 'ScoapSquad Assemble cancelled. ' });
			} else if (del_reaction.emoji.name === '❌') {
				return;
			}
		}).catch(_ => {
			console.log(_);
			console.log('did not react');
		});
	}
	return;
};

const removeReaction = async (collected, user_id, emoji, choice_valid, scoapEmbed) => {
	try {
		for (const reac of collected.values()) {
			if (choice_valid === true) {
				if (reac.emoji.name !== emoji) {
					await reac.users.remove(user_id);
					console.log('remove done');
					scoapEmbed.removeReactionUserId(reac.emoji.name, user_id);
				}
			} else if (choice_valid === false) {
				if (reac.emoji.name === emoji) {
					await reac.users.remove(user_id);
					scoapEmbed.removeReactionUserId(reac.emoji.name, user_id);
				}
			}
		}
	} catch (error) {
		console.error('Failed to remove reactions.');
	}
};

const emojiValid = (emoji, valid_emoji_array) => {
	return valid_emoji_array.includes(emoji);
};

const validateChoice = (emoji, totals, required) => {
	if (totals[emoji] < required[emoji]) {
		return true;
	} else {
		return false;
	}
};

