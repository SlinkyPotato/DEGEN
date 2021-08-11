import { CommandContext, User } from 'slash-create';
import ScoapUtils from '../../utils/ScoapUtils';
import { GuildMember, Message, MessageReaction, TextChannel, Channel } from 'discord.js';
import { ScoapEmbed, BotConversation } from './ScoapClasses';
import constants from '../constants/constants';
import channelIDs from '../constants/channelIDs';
import client from '../../app';
import ScoapPoll from './ScoapPoll';

export const scoapEmbedArray = [];
export const botConvoArray = [];

export default async (guildMember: GuildMember, ctx?: CommandContext): Promise<any> => {
	const title = ctx.options.assemble.new.title;
	const summary = ctx.options.assemble.new.summary;
	const [reward, symbol] = (ctx.options.assemble.new.reward != null) ? ctx.options.assemble.new.reward.split(' ') : [null, null];

	// create ScoapEmbed object
	const scoapEmbed = new ScoapEmbed();
	scoapEmbed.setEmbed({
		title: title,
		author: {
			icon_url: guildMember.user.avatarURL(),
			name: guildMember.user.tag,
		},
		fields: [{ name: 'Summary', value: summary }],
		timestamp: new Date(),
		footer: { text: '👍 - confirm | ❌ - delete draft and start over' },
	}).setScoapAuthor(guildMember.id).setVotableEmojiArray([]);

	if (reward) { scoapEmbed.getEmbed().fields.push({ name: 'Reward', value: reward + ' ' + symbol }); };

	ctx?.send(`${ctx.user.mention} Sent you draft SCOAP Squad request, please verify.`);
	const message: Message = await guildMember.send(
		'Please verify below information. ' +
		'If everything is correct, ' +
		'hit the confirm emoji to start ' +
		'defining roles for your SCOAP squad.\n',
		{ embed: scoapEmbed.getEmbed() }) as Message;

	scoapEmbed.setCurrentChannel(message.channel);
	scoapEmbed.setCurrentMessage(message);
	scoapEmbedArray.push(scoapEmbed);
	
	await message.react('👍');
	await message.react('❌');

	return handleScoapReaction(message, guildMember);
};

export const handleScoapReaction = (message: Message, guildMember: GuildMember): Promise<any> => {
	return message.awaitReactions((reaction, user: User) => {
		return ['👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
		errors: ['time'],
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			console.log('/scoap-squad assemble new | :thumbsup: up given');
			return setScoapRoles(guildMember, message);
		} else {
			console.log('/scoap-squad assemble new | delete given');
			await clearArray(scoapEmbedArray, message);
			// if (publish) { await clearArray(botConvoArray, message); }
			await message.delete();
			return guildMember.send('Message deleted, let\'s start over.');
		}
	}).catch(_ => {
		console.log(_);
		console.log('did not react');
	});
};

export const publishScoapPoll = async (message: Message, scoapEmbed: any): Promise<any> => {
	return message.awaitReactions((reaction, user: User) => {
		return ['👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
		errors: ['time'],
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			scoapEmbed.getEmbed().footer = { text: 'react with emoji to claim a project role | ❌ - abort poll' };
			console.log('/scoap-squad assemble new | :thumbsup: up given');
			const scoapChannel: TextChannel = await client.channels.fetch(channelIDs.scoapSquad) as TextChannel;
			// console.log('scoap Channel ', scoapChannel);
			// const bountyMessage: Message = await scoapChannel.send({ scoapEmbed: embed.getEmbed() }) as Message;
			ScoapPoll(scoapChannel, scoapEmbed);
			return message.channel.send('SCOAP Squad assemble request has been posted in #scoap-squad-assemble');
			// return publishScoapPoll(guildMember, scoapEmbedArray[scoapEmbedArray.map(x => x.current_channel).indexOf(message.channel)]);
		} else {
			console.log('/scoap-squad assemble new | delete given');
			await clearArray(scoapEmbedArray, message);
			await clearArray(botConvoArray, message);
			await message.delete();
			return message.channel.send('Message deleted, let\'s start over.');
		}
	}).catch(_ => {
		console.log(_);
		console.log('did not react');
	});
};
	

const clearArray = async (array, message) => {
	const removeIndex = array.map(item => item.getCurrentChannel()).indexOf(message.channel);
	~removeIndex && array.splice(removeIndex, 1);
};

const setScoapRoles = async (guildMember: GuildMember, message: Message): Promise<any> => {
	const botConvo = new BotConversation();
	botConvo.setTimeout(constants.BOT_CONVERSATION_TIMEOUT_MS).setExpired(false).setConvo(createBotConversationParams()).setCurrentChannel(message.channel);
	botConvoArray.push(botConvo);
	const roleMessage: Message = await guildMember.send('Let\'s define the roles of your SCOAP squad.') as Message;
	botConvo.setCurrentMessageFlowIndex('1', message);
	botConvo.setCurrentMessage(roleMessage);
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