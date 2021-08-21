import { CommandContext, User } from 'slash-create';
import { GuildMember, Message, MessageReaction, TextChannel, MessageEmbed } from 'discord.js';
import { ScoapEmbed, BotConversation } from './ScoapClasses';
import constants from '../constants/constants';
import channelIds from '../constants/channelIds';
import client from '../../app';
import ScoapPoll from './ScoapPoll';
import { scoapEmbedArray, botConvoArray } from '../../app';

export default async (guildMember: GuildMember, ctx?: CommandContext): Promise<any> => {

	const exampleEmbed = {
		title: 'Your Project Title goes here',
		author: {
			icon_url: guildMember.user.avatarURL(),
			name: guildMember.user.tag,
		},
		fields: [
			{ name: 'Summary', value: 'Here goes a summary of your project' },
			{ name: 'Reward', value: 'reward you offer (e.g. 1000 BANK), this is optional' },
			{ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER },
			{
				name: `${constants.EMOJIS['1']} Role 1 title`,
				value: '☝️ This is a project role',
				inline: true,
			},
			{
				name: 'Number',
				value: '☝️ How many people do you need in this role',
				inline: true,
			},
			{
				name: '\u200b',
				value: '\u200b',
				inline: false,
			},

			{
				name: `${constants.EMOJIS['2']} Designer`,
				value: '☝️ An example',
				inline: true,
			},
			{
				name: '2',
				value: '☝️ You are looking for two designers',
				inline: true,
			},
			{
				name: '\u200b',
				value: '\u200b',
				inline: false,
			},
		],
		timestamp: new Date(),
		// footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
	};

	const scoapEmbed = createNewScoapEmbed(guildMember, ctx);
	ctx?.send(`Hi, ${ctx.user.mention}! I just sent you a draft SCOAP Squad request, please verify.`);
	const message: Message = await guildMember.send({
		embeds: [
			new MessageEmbed()
				.setDescription(
					`Hi ${ctx.user.mention}! ` +
					'Below you can see an example of what your ' +
					'SCOAP squad assemble request will look like.')
				.setColor('#0099ff')
				.setFooter(constants.SCOAP_SQUAD_EMBED_SPACER),
			exampleEmbed,
			new MessageEmbed()
				.setDescription(
					'I also prepared a draft layout with your inputs. ' +
					'Please verify the information ' +
					'to proceed to the definition of project roles.')
				.setColor('#0099ff')
				.setFooter(constants.SCOAP_SQUAD_EMBED_SPACER),
			scoapEmbed.getEmbed(),
		],
	}) as Message;
	scoapEmbed.setCurrentChannel(message.channel);
	scoapEmbed.setCurrentMessage(message);
	scoapEmbedArray.push(scoapEmbed);
	await message.react('👍');
	await message.react('📝');
	await message.react('❌');
	return handleScoapDraftReaction('SET_ROLES', [message]);
};

export const handleScoapDraftReaction = (option: string, params: Array<any>): Promise<any> => {
	return params[0].awaitReactions({
		max: 1,
		time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
		errors: ['time'],
		filter: async (reaction, user: User) => {
			return ['👍', '❌', '📝'].includes(reaction.emoji.name) && !user.bot;
		},
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			switch (option) {
			case 'SET_ROLES':
				return setScoapRoles(params[0]);
			case 'PUBLISH':
				return publishScoapPoll(params[0], params[1], params[2]);
			}
		} else if (reaction.emoji.name === '❌') {
			switch (option) {
			case 'SET_ROLES':
				return abortSetScoapRoles(params[0]);
			case 'PUBLISH':
				return abortPublishScoapPoll(params[0]);
			}
		} else {
			console.log('notepad given, launch edit');
			// handle edit #TODO
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
		footer: { text: '👍 - confirm | 📝 - edit | ❌ - delete' },
	}).setScoapAuthor(guildMember.id).setVotableEmojiArray([]);
	if (reward) {
		scoapEmbed.getEmbed().fields.push(
			{ name: 'Reward', value: reward + ' ' + symbol },
			{ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER });
	} else {
		scoapEmbed.getEmbed().fields.push({ name: '\u200b', value: constants.SCOAP_SQUAD_EMBED_SPACER });
	};
	return scoapEmbed;
};

const setScoapRoles = async (message: Message): Promise<any> => {
	const botConvo = new BotConversation();
	botConvo.setTimeout(constants.BOT_CONVERSATION_TIMEOUT_MS)
		.setExpired(false)
		.setConvo(createBotConversationParams())
		.setCurrentChannel(message.channel);
	botConvoArray.push(botConvo);
	botConvo.setCurrentMessageFlowIndex('1', message);
	return;
};

const abortSetScoapRoles = async (message: Message) => {
	await clearArray(scoapEmbedArray, message);
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const publishScoapPoll = async (message: Message, scoapEmbed: any, botConvo: any): Promise<any> => {
	scoapEmbed.getEmbed().footer = { text: 'react with emoji to claim a project role | ❌ - abort poll' };
	const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
	ScoapPoll(scoapChannel, scoapEmbed, botConvo);
	return message.channel.send(`All done! Your SCOAP Squad assemble request has been posted in <#${channelIds.scoapSquad}>`);
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
			'2': 'Title of role # ',
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