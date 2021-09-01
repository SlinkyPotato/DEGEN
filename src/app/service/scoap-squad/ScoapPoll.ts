import { TextChannel, MessageReaction } from 'discord.js';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import constants from '../constants/constants';
import { Vote, VoteRecord } from './ScoapClasses';
import { scoapEmbedState, botConvoState } from '../../app';
import ScoapUtils from '../../utils/ScoapUtils';
import { updateScoapOnNotion } from './ScoapNotion';

// Note - make sure to get rid of embed-objects and bot-convo objects in array after scoap poll is completed

export default async (channel: TextChannel, scoapEmbed: any): Promise<any> => {

	const validEmojiArray = cloneDeep(scoapEmbed.getVotableEmojiArray());
	validEmojiArray.push(constants.EMOJIS.cross_mark);

	const emoteRequired = {};
	const emoteTotals = {};
	const progressStrings = {};
	// Array(botConvo.getConvo().user_response_record.number_of_roles).fill(0).map((_, i) => {
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

	const embedMessage = await channel.send({ embeds: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentChannel(channel).setCurrentMessage(embedMessage);

	for (const item of validEmojiArray) {
		// console.log(item);
		await embedMessage.react(item);
	}

	const filter = (reaction, user) => {
		const emoji_valid = emojiValid(reaction.emoji.name, validEmojiArray);
		const bot_reaction = user.bot;
		return (emoji_valid && (!bot_reaction));
	};

	const collector = embedMessage.createReactionCollector({
		filter,
		dispose: true,
		// time: 
	});

	collector.on('collect', async (reaction, user) => {
		const choiceValid = validateChoice(
			reaction.emoji.name,
			voteRecord.getEmoteTotals(),
			voteRecord.getEmoteRequired(),
		);

		if (reaction.emoji.name === '❌') {
			return handleDeletePoll(user, scoapEmbed, embedMessage);

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
						reaction,
						vote.getUserId(),
						vote.getEmoji(),
						choiceValid,
					);
				}

				for (const key in voteRecord.getProgressStrings()) {
					scoapEmbed.updateProgressString(
						key,
						voteRecord.getProgressStrings()[key],
					);
				}
				embedMessage.edit({ embeds: scoapEmbed.getEmbed() });

				if (isEqual(voteRecord.getEmoteTotals(), voteRecord.getEmoteRequired())) {
					// console.log('POLL COMPLETE ');
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
				);
				break;
			}
			}
		}
	});

	collector.on('end', async (collected) => {
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
		console.log('POLL COMPLETE');
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
				// console.log('key ', key, ' value ', voteRecord.getProgressStrings()[key]);
				scoapEmbed.updateProgressString(
					key,
					voteRecord.getProgressStrings()[key],
				);
			}
			embedMessage.edit({ embeds: scoapEmbed.getEmbed() });
		}
	});
	return;
};


const handleDeletePoll = async (user, scoapEmbed, embedMessage) => {
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
				embedMessage.delete();
				delete scoapEmbedState[scoapEmbed.getId()];
				// await ScoapUtils.clearArray(scoapEmbedArray, scoapEmbed.getCurrentMessage());
				// await ScoapUtils.clearArray(botConvoArray, botConvo.getCurrentMessage());
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

const removeReaction = async (reaction, user_id, emoji, choice_valid) => {
	const userReactions = await reaction.message.reactions.cache.filter((reac) => {
		return reac.users.cache.has(user_id);
	});
	try {
		for (const reac of userReactions.values()) {
			if (choice_valid === true) {
				// the selected choice is available, only remove choices that don't match current choice
				if (reac.emoji.name !== emoji) {
					await reac.users.remove(user_id);
					break;
				}
			} else if (choice_valid === false) {
				// the selected choice is not available, only remove choices that do match current choice
				if (reac.emoji.name === emoji) {
					await reac.users.remove(user_id);
					break;
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

