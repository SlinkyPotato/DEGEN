import { TextChannel } from 'discord.js';
import cloneDeep from 'lodash.clonedeep';
import constants from '../constants/constants';
import { ScoapEmbed, Vote, VoteRecord } from './ScoapClasses';

const scoapEmbedTemplate = {
	color: 0x0099ff,
	title: 'SCOAP SQUAD - NEW WEBSITE',
	url: 'https://www.bankless.community',
	author: {
		name: 'posted by user Tiki',
		url: 'https://www.bankless.community',
	},
	description: 'Project Summary',
	fields: [
		{
			name: `${constants.EMOJIS.one} PM`,
			value: '\u200b',
			inline: true,
		},

		{
			name: '0 % (0/1)',
			value: '\u200b',
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: `${constants.EMOJIS.two} DEV`,
			value: 'JS, Web3',
			inline: true,
		},
		{
			name: '0% (0/3)',
			value: '\u200b',
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: `${constants.EMOJIS.three} UI`,
			value: 'Chakra',
			inline: true,
		},
		{
			name: '0% (0/2)',
			value: '\u200b',
			inline: true,
		},
	],
	timestamp: new Date(),
	footer: {
		text: 'You may select only one option in this poll',
	},
};

const removeReaction = async (message, user_id, emoji, choice_valid) => {
	const userReactions = message.reactions.cache.filter((reaction) => {
		reaction.users.cache.has(user_id);
	});
	try {
		for (const reac of userReactions.values()) {
			if (choice_valid === true) {
				// the selected choice is available, only remove choices that don't match current choice
				if (reac.emoji.name !== emoji) {
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

type NewType = any;

// Note: How to do correct type definition for request?
export default async (channel: TextChannel, request: NewType): Promise<any> => {
	// console.log(' here is the request body ', request.body.scoap);
	const deepEmbed = cloneDeep(scoapEmbedTemplate);

	const votableEmojiArray = [
		constants.EMOJIS.one,
		constants.EMOJIS.two,
		constants.EMOJIS.three,
	];

	const validEmojiArray = votableEmojiArray.push(constants.EMOJIS.cross_mark);

	const voteRecord = new VoteRecord();

	const scoapEmbed = new ScoapEmbed(deepEmbed, '749152252966469668');

	const embedMessage = await channel.send({ embed: scoapEmbed.getEmbed() });

	await embedMessage.react(constants.EMOJIS.one);
	await embedMessage.react(constants.EMOJIS.two);
	await embedMessage.react(constants.EMOJIS.three);
	await embedMessage.react(constants.EMOJIS.cross_mark);

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

		if (emojiValid(reaction.emoji.name, votableEmojiArray) === true) {
			switch (true) {
				case choiceValid === true: {
					const vote = new Vote(
						user.id,
						reaction.emoji.name,
						voteRecord.getUserVoteLedger(),
					);
					voteRecord.update(vote);

					if (vote.getType() === 'CHANGEVOTE') {
						await removeReaction(
							embedMessage,
							vote.getUserId(),
							vote.getEmoji(),
							choiceValid,
						);
					}

					for (const key in voteRecord.getProgressStrings()) {
						// console.log('key ', key, ' value ', voteRecord.getProgressStrings()[key]);
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
			console.log(reaction.emoji.name);
			// handle delete
			// handle add
			// handle edit
		}

		// console.log(`Collected ${reaction.emoji.name} from user ${user.id}`);
		// console.log('current state: \n emote total ', voteRecord.getEmoteTotals());
		// console.log('current state: \n emote total ', voteRecord.getEmoteRequired());
		// console.log('current state: \n user vote record ', voteRecord.getUserVoteLedger());
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

			// console.log(`Collected ${reaction.emoji.name} from user ${user.id}`);
			// console.log('current state: \n emote total ', voteRecord.getEmoteTotals());
			// console.log('current state: \n emote total ', voteRecord.getEmoteRequired());
			// console.log('current state: \n user vote record ', voteRecord.getUserVoteLedger());
		}
	});
	return request.body;
};
