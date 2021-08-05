import { TextChannel } from 'discord.js';
// import { FastifyRequest } from 'fastify';
// import client from '../app';
import constants from './../constants';

const scoapEmbed = {
    color: 0x0099ff,
    title: 'SCOAP SQUAD - NEW WEBSITE',
    url: 'https://www.bankless.community',
    author: {
        name: 'Posted by user Tiki',
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

// const updateProgressString = (progressString) => {
// 	let st = progressString.match(/\(([^)]+)\)/)[1];
// 	let current = st.split('/')[0];
// 	let target = st.split('/')[1];
// 	let newCurrent = parseInt(current) + 1;
// 	let percent = Math.round(100/parseInt(target)*newCurrent);
// 	let updateStr = `${percent}%(${newCurrent}/${target})`;
// 	return updateStr;
// };

const updateEmbedFields = (emoji, embed_fields, update_progress_string) => {
    for (const [i, field] of embed_fields.entries()) {
        if (field.name.includes(emoji)) {
            embed_fields[i + 1].name = update_progress_string;
            return embed_fields;
        }
    }
};

const emojiValid = (emoji, valid_emoji_array) => {
    return valid_emoji_array.includes(emoji);
};

const removeReaction = async (message, user_id, emoji, choice_available) => {
    console.log('inside remove reaction');
    const userReactions = message.reactions.cache.filter((reaction) =>
        reaction.users.cache.has(user_id));
    try {
        for (const reac of userReactions.values()) {
            // console.log('reaction object ', reac)
            console.log('reaction emoji ', reac.emoji.name);

            if (choice_available === true) {
                // the selected choice is available, only remove choices that don't match current choice
                if (reac.emoji.name !== emoji) {
                    await reac.users.remove(user_id);
                    console.log('reaction removed by bot, case true');
                    break;
                }
            } else if (choice_available === false) {
                // the selected choice is not available, only remove choices that do match current choice
                if (reac.emoji.name === emoji) {
                    await reac.users.remove(user_id);
                    console.log('reaction removed by bot, case false');
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Failed to remove reactions.');
    }
};

const updateEmoteTotals = (emoji, old_emoji, emote_total, choice_type) => {
    switch (choice_type) {
        case 'NEWVOTE':
            ++emote_total[emoji];
            return emote_total;
        case 'REVOTE':
            ++emote_total[emoji];
            return emote_total;
        case 'CHANGEVOTE':
            --emote_total[old_emoji];
            ++emote_total[emoji];
            return emote_total;
        case 'UNVOTE':
            --emote_total[emoji];
            return emote_total;
    }
};

const updateUserVoteRecord = async (
    user_id,
    emoji,
    vote_record,
    message,
    emote_total,
    choice_type
) => {
    switch (choice_type) {
        case 'NEWVOTE': {
            const totals = updateEmoteTotals(
                emoji,
                vote_record[user_id],
                emote_total,
                choice_type
            );
            vote_record[user_id] = emoji;
            return [vote_record, totals];
        }
        case 'REVOTE': {
            const totals = updateEmoteTotals(
                emoji,
                vote_record[user_id],
                emote_total,
                choice_type
            );
            vote_record[user_id] = emoji;
            return [vote_record, totals];
        }
        case 'CHANGEVOTE': {
            const totals = updateEmoteTotals(
                emoji,
                vote_record[user_id],
                emote_total,
                choice_type
            );
            // await removeReaction(message, user_id, emoji);
            vote_record[user_id] = emoji;
            return [vote_record, totals];
        }
        case 'UNVOTE': {
            const totals = updateEmoteTotals(
                emoji,
                vote_record[user_id],
                emote_total,
                choice_type
            );
            vote_record[user_id] = '';
            return [vote_record, totals];
        }
        case 'ERROR':
            console.log('error');
            return [vote_record, emote_total];
    }
};

const validateEmoteTotals = (emoji, totals, required) => {
    if (totals[emoji] < required[emoji]) {
        console.log('selected choice available');
        return true;
    } else {
        console.log('selected choice not available');
        return false;
    }
};

const checkVoteType = (user_id, emoji, vote_record) => {
    // if (vote_record.hasOwnProperty(user_id)) {
    if (Object.prototype.hasOwnProperty.call(vote_record, user_id)) {
        // user has already voted
        if (vote_record[user_id] === '') {
            // revote
            console.log('vote type check: REVOTE');
            return 'REVOTE';
        } else if (vote_record[user_id] === emoji) {
            // unvote
            console.log('vote type check: UNVOTE');
            return 'UNVOTE';
        } else if (vote_record[user_id] !== emoji) {
            // change vote
            console.log('vote type check: CHANGEVOTE');
            return 'CHANGEVOTE';
        } else {
            console.log('this should be impossible, vote type error..');
            return 'ERROR';
        }
    } else {
        // user has not voted yet
        vote_record[user_id] = emoji;
        console.log('vote type check: NEWVOTE');
        return 'NEWVOTE';
    }
};

const updateProgressString = (emoji, emote_total, emote_required) => {
    console.log(
        `updating progress string, inputs: ${emoji}, ${emote_total}, ${emote_required}`
    );
    const percent = Math.round(
        (100 / parseInt(emote_required[emoji])) * emote_total[emoji]
    );
    const updateStr = `${percent}%(${emote_total[emoji]}/${emote_required[emoji]})`;
    console.log(`new progress string: ${updateStr}`);
    return updateStr;
};

// Note: How to do correct type definition for request?
export default async (channel: TextChannel, request: any): Promise<any> => {
    console.log(' here is the request body ', request.body);
    const embedMessage = await channel.send({ embed: scoapEmbed });

    await embedMessage.react(constants.EMOJIS.one);
    await embedMessage.react(constants.EMOJIS.two);
    await embedMessage.react(constants.EMOJIS.three);

    const validEmojiArray = [
        constants.EMOJIS.one,
        constants.EMOJIS.two,
        constants.EMOJIS.three,
    ];

    // {user_id: emoji}
    let userVoteRecord = {};

    let emoteTotal = {
        // {emoji<unicode>: current_total<int>}
        [constants.EMOJIS.one]: 0,
        [constants.EMOJIS.two]: 0,
        [constants.EMOJIS.three]: 0,
    };

    const emoteRequired = {
        // {emoji<unicode>: required_total<int>}
        [constants.EMOJIS.one]: 1,
        [constants.EMOJIS.two]: 3,
        [constants.EMOJIS.three]: 2,
    };

    let choiceAvailable = true;

    // const four = client.emojis.cache.find(emoji => emoji.name === "like");
    // const four = client.emojis.find(emoji => emoji.name === "like");

    // Create a reaction collector
    const filter = (reaction) => {
        const emoji_valid = emojiValid(reaction.emoji.name, validEmojiArray);
        console.log('emoji valid? ', emoji_valid);
        return emoji_valid;
    };

    const collector = embedMessage.createReactionCollector(
        filter,
        { dispose: true }
    );
    collector.on('collect', async (reaction, user) => {
        // check if desired choice is still available
        choiceAvailable = validateEmoteTotals(
            reaction.emoji.name,
            emoteTotal,
            emoteRequired
        );
        console.log('CHOICE AVAILABLE ', choiceAvailable);

        // compare user choice with vote record
        const choiceType = checkVoteType(
            user.id,
            reaction.emoji.name,
            userVoteRecord
        );

        switch (true) {
            case choiceAvailable === true: {
                console.log(
                    'your choice is still available, running updateUserVoteRecord()'
                );
                // update user vote record
                const updateArray = await updateUserVoteRecord(
                    user.id,
                    reaction.emoji.name,
                    userVoteRecord,
                    embedMessage,
                    emoteTotal,
                    choiceType
                );
                userVoteRecord = updateArray[0];
                emoteTotal = updateArray[1];
                if (choiceType === 'CHANGEVOTE') {
                    await removeReaction(
                        embedMessage,
                        user.id,
                        reaction.emoji.name,
                        choiceAvailable
                    );
                }
                break;
            }
            case choiceAvailable === false: {
                if (['NEWVOTE', 'REVOTE', 'CHANGEVOTE'].includes(choiceType)) {
                    console.log(
                        'your choice is not available, type: NEWVOTE, REVOTE or CHANGEVOTE, running removeReaction()'
                    );
                    await removeReaction(
                        embedMessage,
                        user.id,
                        reaction.emoji.name,
                        choiceAvailable
                    );
                    break;
                } else {
                    console.log('Error: ', choiceType);
                    break;
                }
            }
        }

        const newProgressString = updateProgressString(
            reaction.emoji.name,
            emoteTotal,
            emoteRequired
        );

        // deep copy embed's fields to new array
        const embedFields = Object.assign([], embedMessage.embeds[0].fields);

        // updated fields
        const updatedEmbedFields = updateEmbedFields(
            reaction.emoji.name,
            embedFields,
            newProgressString
        );

        // update embed
        scoapEmbed.fields = updatedEmbedFields;
        embedMessage.edit({ embed: scoapEmbed });
        console.log(`Collected ${reaction.emoji.name} from user ${user.id}`);
        console.log('current state: \n emote total ', emoteTotal);
        console.log('current state: \n emote total ', emoteRequired);
        console.log('current state: \n user vote record ', userVoteRecord);
        // console.log(`current state: \n collection `, collector.collected)
    });

    collector.on('end', (collected) =>
        console.log(`Collected ${collected.size} items`)
    );

    collector.on('remove', async (reaction, user) => {
        console.log('remove signal');
        // compare user choice with vote record
        const choiceType = checkVoteType(
            user.id,
            reaction.emoji.name,
            userVoteRecord
        );
        if (choiceType === 'UNVOTE') {
            console.log(
                'your choice is UNVOTE type, running updateUserVoteRecord()'
            );
            const updateArray = await updateUserVoteRecord(
                user.id,
                reaction.emoji.name,
                userVoteRecord,
                embedMessage,
                emoteTotal,
                choiceType
            );
            userVoteRecord = updateArray[0];
            emoteTotal = updateArray[1];
            choiceAvailable = true;
        } else {
            console.log('an error happened');
        }
        const newProgressString = updateProgressString(
            reaction.emoji.name,
            emoteTotal,
            emoteRequired
        );

        // deep copy embed's fields to new array
        const embedFields = Object.assign([], embedMessage.embeds[0].fields);

        // updated fields
        const updatedEmbedFields = updateEmbedFields(
            reaction.emoji.name,
            embedFields,
            newProgressString
        );

        // update embed
        scoapEmbed.fields = updatedEmbedFields;
        embedMessage.edit({ embed: scoapEmbed });
        console.log(`Collected ${reaction.emoji.name} from user ${user.id}`);
        console.log('current state: \n emote total ', emoteTotal);
        console.log('current state: \n emote total ', emoteRequired);
        console.log('current state: \n user vote record ', userVoteRecord);
    });

    return request.body;
};
