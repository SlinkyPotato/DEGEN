import { TextChannel } from 'discord.js';
// import cloneDeep from 'lodash.clonedeep';
import constants from '../constants/constants';
import { Vote, VoteRecord } from './ScoapClasses';

	// Note - make sure to get rid of embed-objects and bot-convo objects in array after scoap poll is completed

const removeReaction = async (message, user_id, emoji, choice_valid) => {
	const userReactions = await message.reactions.cache.filter((reaction) => {
		return reaction.users.cache.has(user_id);
	});
	try {
		for (const reac of userReactions.values()) {
			console.log('reac ', reac);
			if (choice_valid === true) {
				console.log('here');
				// the selected choice is available, only remove choices that don't match current choice
				if (reac.emoji.name !== emoji) {
					console.log('here now');
					await reac.users.remove(user_id);
					// console.log('reaction removed by bot, case true');
					break;
				}
			} else if (choice_valid === false) {
				// the selected choice is not available, only remove choices that do match current choice
				if (reac.emoji.name === emoji) {
					await reac.users.remove(user_id);
					// console.log('reaction removed by bot, case false');
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
		// console.log('selected choice available');
		return true;
	} else {
		// console.log('selected choice invalid');
		return false;
	}
};

// type NewType = any;
// request: NewType

// Note: How to do correct type definition for request?
export default async (channel: TextChannel, scoapEmbed: any, botConvo: any): Promise<any> => {

	const validEmojiArray = scoapEmbed.getVotableEmojiArray();
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

	const voteRecord = new VoteRecord().setUserVoteLedger({}).setEmoteRequired(emoteRequired).setEmoteTotals(emoteTotals).setProgressStrings(progressStrings);

	const embedMessage = await channel.send({ embed: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentChannel(channel).setCurrentMessage(embedMessage);

	for (const item of validEmojiArray) {
		// console.log(item);
		await embedMessage.react(item);
	}

	const filter = (reaction) => {
		const emoji_valid = emojiValid(reaction.emoji.name, validEmojiArray);
		// console.log('emoji valid? ', emoji_valid);
		return emoji_valid;
	};

	const collector = embedMessage.createReactionCollector(filter, {
		dispose: true,
	});

	collector.on('collect', async (reaction, user) => {
		const choiceValid = validateChoice(
			reaction.emoji.name,
			voteRecord.getEmoteTotals(),
			voteRecord.getEmoteRequired(),
		);

		if (emojiValid(reaction.emoji.name, scoapEmbed.getVotableEmojiArray()) === true) {
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
					console.log('invoking remove vote. choice vlaid = ', choiceValid, ' ', 'user id = ', vote.getUserId());
					console.log('message reactions', embedMessage.reactions.cache);
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
				embedMessage.edit({ embed: scoapEmbed.getEmbed() });

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
			for (const key in voteRecord.getProgressStrings()) {
				// console.log('key ', key, ' value ', voteRecord.getProgressStrings()[key]);
				scoapEmbed.updateProgressString(
					key,
					voteRecord.getProgressStrings()[key],
				);
			}
			embedMessage.edit({ embed: scoapEmbed.getEmbed() });
		}
	});
	return;
};
