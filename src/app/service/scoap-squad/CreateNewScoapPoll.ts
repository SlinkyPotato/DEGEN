import { CommandContext, User } from 'slash-create';
import ScoapUtils from '../../utils/ScoapUtils';
import { GuildMember, Message, MessageOptions, MessageReaction } from 'discord.js';
// import { setScoapRoles } from './SetRolesCommandScoap';
import { ScoapEmbed, BotConversation } from './ScoapClasses';
import constants from '../constants/constants';
// import cloneDeep from 'lodash.clonedeep';

// const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

// export const scoapEmbed = new ScoapEmbed();

export const scoapEmbedArray = [];
export const botConvoArray = [];

export default async (guildMember: GuildMember, params: any, ctx?: CommandContext): Promise<any> => {
	const title = params.title;
	const summary = params.summary;
	const reward = params.reward;
	const messageOptions: MessageOptions = {
		embed: {
			title: title,
			// url: (constants.BOUNTY_BOARD_URL + dbInsertResult.insertedId),
			author: {
				icon_url: guildMember.user.avatarURL(),
				name: guildMember.user.tag,
			},
			// description: summary,
			fields: [
				{ name: 'Summary', value: summary },
				{ name: 'Reward', value: reward.amount + ' ' + reward.currencySymbol, inline: true },
				{ name: 'CreatedBy', value: guildMember.user.tag, inline: true },
			],
			timestamp: new Date(),
			footer: {
				text: '👍 - confirm | ❌ - delete draft and start over',
			},
		},
	};
	ctx?.send(`${ctx.user.mention} Sent you draft SCOAP Squad request, please verify.`);
	const message: Message = await guildMember.send(
		'Please verify below information. ' +
		'If everything is correct, ' +
		'hit the confirm emoji to start ' +
		'defining roles for your SCOAP squad.\n',
		messageOptions) as Message;
	
	await message.react('👍');
	await message.react('❌');

	return handleScoapReaction(message, guildMember);
};

const handleScoapReaction = (message: Message, guildMember: GuildMember): Promise<any> => {
	return message.awaitReactions((reaction, user: User) => {
		return ['👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (60000 * 60),
		errors: ['time'],
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			console.log('/scoap-squad assemble new | :thumbsup: up given');
			return setScoapRoles(guildMember, message);
		} else {
			console.log('/scoap-squad assemble new | delete given');
			await message.delete();
			return guildMember.send('Message deleted, let\'s start over.');
		}
	}).catch(_ => {
		console.log(_);
		console.log('did not react');
	});
};

export const setScoapRoles = async (guildMember: GuildMember, message: Message): Promise<any> => {
	console.log('ready to set roles: ');

	// create ScoapEmbed object
	const draftEmbed = message.embeds[0];
	const scoapEmbed = new ScoapEmbed();
	scoapEmbed.setEmbed(draftEmbed).setScoapAuthor(guildMember.id).setCurrentChannel(message.channel);
	scoapEmbedArray.push(scoapEmbed);

	const botConvo = new BotConversation();
	botConvo.setTimeout(constants.BOT_CONVERSATION_TIMEOUT_MS).setExpired(false).setConvo(createBotConversationParams()).setCurrentChannel(message.channel);
	botConvoArray.push(botConvo);
	console.log('BOT CONVO ARRAY ', botConvoArray);

	// `(Timeout after ${constants.BOT_CONVERSATION_TIMEOUT_MS / 60000} minutes | Reply cancel to abort)\n\n`
	const roleMessage: Message = await guildMember.send('Let\'s define the roles for your SCOAP squad.') as Message;

	scoapEmbed.setCurrentMessage(roleMessage);
	botConvo.setCurrentMessageFlowIndex('1', message);

	// console.log('scoap embed array before remove', scoapEmbedArray);
	// await sleep(constants.BOT_CONVERSATION_TIMEOUT_MS);
	// await guildMember.send('Conversation has timed out, please start over') as Message;
	// const removeIndex = scoapEmbedArray.map(embed => embed.current_channel).indexOf(message.channel);
	// ~removeIndex && scoapEmbedArray.splice(removeIndex, 1);
	// console.log('scoap embed array after remove', scoapEmbedArray);


	return;


};


const createBotConversationParams = () => {
	
	const convo = {
		message_flow: {
			'1': 'How many roles do you want to define in total? \n',
			'2': 'Role title: ',
			'3': 'Role count: ',
			'4': 'Thank you for your input, please verify layout..',
		},
		cancel_options: ['cancel', 'abort', 'stop', 'exit', 'shut up'],
		confirm_options: ['yes', 'ok', 'do it already'],
		choices: {
			'one_to_ten': Array.from(Array(10).keys()),
		},
		// conditions: {
		// 	'1': function(x) { isInteger(x); },
		// 	'2': function(x) { typeof x === 'string'; },
		// },
		user_response_record: {},
	};

	return convo;

};

// export const confirmUserInput = async (guildMember: GuildMember, message: Message): Promise<any> => {
// 	console.log('ready to set roles: ');

// 	// create ScoapEmbed object
// 	const draftEmbed = message.embeds[0];
// 	const scoapEmbed = new ScoapEmbed();
// 	scoapEmbed.setEmbed(draftEmbed).setScoapAuthor(guildMember.id).setCurrentChannel(message.channel);
// 	scoapEmbedArray.push(scoapEmbed);

// 	const roleMessage: Message = await guildMember.send(
// 		'Let\'s define the roles for your SCOAP squad.' +
// 		'You have to define at least one role and you can define up to 10 different roles.\n' +
// 		'first off, How many roles do you want to define in total? \n' +
// 		'Reply to this message with a number between 1 and 10') as Message;

// 	scoapEmbed.setCurrentMessage(roleMessage);

// 	return roleMessage;


// };