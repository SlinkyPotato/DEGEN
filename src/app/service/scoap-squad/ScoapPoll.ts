import { TextChannel } from 'discord.js';
import cloneDeep from 'lodash.clonedeep';
import constants from '../constants/constants';
import { Vote, VoteRecord } from './ScoapClasses';

// Note - make sure to get rid of embed-objects and bot-convo objects in array after scoap poll is completed

const removeReaction = async (message, user_id, emoji, choice_valid) => {
	const userReactions = await message.reactions.cache.filter((reaction) => {
		return reaction.users.cache.has(user_id);
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

// type NewType = any;
// request: NewType

// Note: How to do correct type definition for request?
export default async (channel: TextChannel, scoapEmbed: any, botConvo: any): Promise<any> => {

	const validEmojiArray = cloneDeep(scoapEmbed.getVotableEmojiArray());
	validEmojiArray.push(constants.EMOJIS.cross_mark);

	const emoteRequired = {};
	const emoteTotals = {};
	const progressStrings = {};
	Array(parseInt(botConvo.getConvo().user_response_record['1'])).fill(0).map((_, i) => {
		const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
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

	const embedMessage = await channel.send({ embeds: [scoapEmbed.getEmbed()] });
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
	});

	collector.on('collect', async (reaction, user) => {
		const choiceValid = validateChoice(
			reaction.emoji.name,
			voteRecord.getEmoteTotals(),
			voteRecord.getEmoteRequired(),
		);

		if (emojiValid(reaction.emoji.name, scoapEmbed.getVotableEmojiArray())) {
			switch (true) {
			case choiceValid === true: {
				const vote = new Vote(
					user.id,
					reaction.emoji.name,
					voteRecord.getUserVoteLedger(),
				);
				voteRecord.update(vote);
				console.log('received vote from user: ', user.id, ' ', reaction.emoji.name);
				console.log(voteRecord.getUserVoteLedger());


				if (vote.getType() === 'CHANGEVOTE') {
					await removeReaction(
						embedMessage,
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
				embedMessage.edit({ embeds: [scoapEmbed.getEmbed()] });

				break;
			}
			case choiceValid === false: {
				await removeReaction(
					embedMessage,
					user.id,
					reaction.emoji.name,
					choiceValid,
				);
				break;
			}
			}
		} else {
			// console.log(reaction.emoji.name);
			// handle delete
			// handle add
			// handle edit
		}

	});

	collector.on('end', (collected) => {
		console.log(`Collected ${collected.size} items`);
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
			embedMessage.edit({ embeds: [scoapEmbed.getEmbed()] });
		}
	});
	return;
};
