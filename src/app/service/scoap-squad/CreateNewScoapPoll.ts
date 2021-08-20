import { CommandContext, User } from 'slash-create';
import { GuildMember, Message, MessageReaction, TextChannel } from 'discord.js';
import { ScoapEmbed, BotConversation } from './ScoapClasses';
import constants from '../constants/constants';
import channelIDs from '../constants/channelIDs';
import client from '../../app';
import ScoapPoll from './ScoapPoll';
import { scoapEmbedArray, botConvoArray } from '../../app';

export default async (guildMember: GuildMember, ctx?: CommandContext): Promise<any> => {
	const scoapEmbed = createNewScoapEmbed(guildMember, ctx);
	ctx?.send(`Hi, ${ctx.user.mention}! I just sent you a draft SCOAP Squad request, please verify.`);
	const message: Message = await guildMember.send(
		'Please verify the information below. ' +
		'If everything is correct, ' +
		'hit the confirm emoji to start ' +
		'defining roles for your SCOAP squad.\n',
		{ embed: scoapEmbed.getEmbed() }) as Message;
	scoapEmbed.setCurrentChannel(message.channel);
	scoapEmbed.setCurrentMessage(message);
	scoapEmbedArray.push(scoapEmbed);
	await message.react('👍');
	await message.react('❌');
	return handleScoapDraftReaction('SET_ROLES', [message]);
};

export const handleScoapDraftReaction = (option: string, params: Array<any>): Promise<any> => {
	return params[0].awaitReactions((reaction, user: User) => {
		return ['👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
		errors: ['time'],
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			switch (option) {
			case 'SET_ROLES':
				return setScoapRoles(params[0]);
			case 'PUBLISH':
				return publishScoapPoll(params[0], params[1], params[2]);
			}
		} else {
			switch (option) {
			case 'SET_ROLES':
				return abortSetScoapRoles(params[0]);
			case 'PUBLISH':
				return abortPublishScoapPoll(params[0]);
			}
		}
	}).catch(_ => {
		console.log(_);
		console.log('did not react');
	});
};

const createNewScoapEmbed = (guildMember: GuildMember, ctx?: CommandContext): any => {
	const title = ctx.options.assemble.new.title;
	const summary = ctx.options.assemble.new.summary;
	const [reward, symbol] = (ctx.options.assemble.new.reward != null) ? ctx.options.assemble.new.reward.split(' ') : [null, null];
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
	return scoapEmbed;
};

const setScoapRoles = async (message: Message): Promise<any> => {
	const botConvo = new BotConversation();
	botConvo.setTimeout(constants.BOT_CONVERSATION_TIMEOUT_MS).setExpired(false).setConvo(createBotConversationParams()).setCurrentChannel(message.channel);
	botConvoArray.push(botConvo);
	const roleMessage: Message = await message.channel.send('Let\'s define the roles of your SCOAP squad.') as Message;
	botConvo.setCurrentMessageFlowIndex('1', message);
	botConvo.setCurrentMessage(roleMessage);
	return;
};

const abortSetScoapRoles = async (message: Message) => {
	await clearArray(scoapEmbedArray, message);
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const publishScoapPoll = async (message: Message, scoapEmbed: any, botConvo: any): Promise<any> => {
	scoapEmbed.getEmbed().footer = { text: 'react with emoji to claim a project role | ❌ - abort poll' };
	const scoapChannel: TextChannel = await client.channels.fetch(channelIDs.scoapSquad) as TextChannel;
	ScoapPoll(scoapChannel, scoapEmbed, botConvo);
	return message.channel.send('SCOAP Squad assemble request has been posted in #🥷-scoap-squad-assemble');
};

const abortPublishScoapPoll = async (message: Message) => {
	await clearArray(scoapEmbedArray, message);
	await clearArray(botConvoArray, message);
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const clearArray = async (array, message) => {
	const removeIndex = array.map(item => item.getCurrentChannel()).indexOf(message.channel);
	~removeIndex && array.splice(removeIndex, 1);
};

const createBotConversationParams = () => {
	const convo = {
		message_flow: {
			'1': 'You\'ll give each role a title, and ' +
				 'specify how many people you\'ll need ' +
				 'to fill each role in the proceeding prompts. ' +
				 'How many roles do you want to define? ',
			'2': 'Role title: ',
			'3': 'How many people do you need in this role: ',
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