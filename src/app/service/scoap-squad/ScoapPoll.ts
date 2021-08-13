import { TextChannel } from 'discord.js';
// import cloneDeep from 'lodash.clonedeep';
import constants from '../constants/constants';
import { Vote, VoteRecord } from './ScoapClasses';

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
			name: `${constants.EMOJIS['1']} PM`,
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
			name: `${constants.EMOJIS['2']} DEV`,
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
			name: `${constants.EMOJIS['3']} UI`,
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
	console.log('inside remove function');
	console.log('params ', 'userid ', user_id, ' emoji ', emoji, ' choice valid ', choice_valid);
	const userReactions = await message.reactions.cache.filter((reaction) => {
		return reaction.users.cache.has(user_id);
		// console.log('REACTION ', reaction.users.cache.has(user_id));
	});
	console.log('user reactions ', userReactions);
	console.log('message ', message);
	console.log('message reactions', message.reactions.cache);
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

	// const deepEmbed = cloneDeep(scoapEmbedTemplate);


	// const votableEmojiArray = [
	// 	constants.EMOJIS['1'],
	// 	constants.EMOJIS['2'],
	// 	constants.EMOJIS['3'],
	// ];

	// const validEmojiArray = votableEmojiArray.push(constants.EMOJIS.cross_mark);
	const validEmojiArray = scoapEmbed.getVotableEmojiArray();
	validEmojiArray.push(constants.EMOJIS.cross_mark);

	const emoteRequired = {};
	const emoteTotals = {};
	const progressStrings = {};
	Array(parseInt(botConvo.getConvo().user_response_record['1'])).fill(0).map((_, i) => {
		// console.log('i ', i);
		const role = botConvo.getConvo().user_response_record.roles[(i + 1).toString()];
		const emoji = constants.EMOJIS[(i + 1).toString()];
		emoteRequired[emoji] = parseInt(role.role_count);
		emoteTotals[emoji] = 0;
		progressStrings[emoji] = `0/${role.role_count} 0%`;

	});

	const voteRecord = new VoteRecord().setUserVoteLedger({}).setEmoteRequired(emoteRequired).setEmoteTotals(emoteTotals).setProgressStrings(progressStrings);

	console.log('EMOTE REQUIRED ', voteRecord.getEmoteRequired());
	console.log('EMOTE TOTALS ', voteRecord.getEmoteTotals());
	console.log('PROGRESS STRINGS ', voteRecord.getProgressStrings());


	// const scoapEmbed = new ScoapEmbed(deepEmbed, '749152252966469668', channel);
	// const scoapEmbed = new ScoapEmbed();

	// scoapEmbed.setEmbed(deepEmbed).setScoapAuthor('749152252966469668').setCurrentChannel(channel);

	const embedMessage = await channel.send({ embed: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentChannel(channel).setCurrentMessage(embedMessage);

	// validEmojiArray.forEach(async function(item, index) {
	// 	await embedMessage.react(item);
	// 	console.log(item, index);
	// });

	for (const item of validEmojiArray) {
		// console.log(item);
		await embedMessage.react(item);
	}


	// await embedMessage.react(constants.EMOJIS['1']);
	// await embedMessage.react(constants.EMOJIS['2']);
	// await embedMessage.react(constants.EMOJIS['3']);
	// await embedMessage.react(constants.EMOJIS.cross_mark);

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
			// console.log(reaction.emoji.name);
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
	// return request.body;
	return;
};
