import { CommandContext, User } from 'slash-create';
import { GuildMember, Message, MessageReaction, TextChannel } from 'discord.js';
import { BotConversation } from './ScoapClasses';
import constants from '../constants/constants';
import channelIds from '../constants/channelIds';
import client from '../../app';
import ScoapPoll from './ScoapPoll';
import { scoapEmbedState, botConvoState } from '../../app';
import { scoapEmbedEdit } from './EditScoapDraft';
// import ScoapUtils from '../../utils/ScoapUtils';
import { createNewScoapOnNotion } from './ScoapNotion';


export default async (guildMember: GuildMember, ctx?: CommandContext): Promise<any> => {
	ctx?.send(`Hi, ${ctx.user.mention}! I sent you a DM with more information.`);
	const botConvo = await createBotConversation(guildMember);
	return initiateScoapDraft(botConvo);
};

export const handleScoapDraftReaction = (option: string, params: Array<any>): Promise<any> => {
	return params[0].awaitReactions({
		max: 1,
		time: (constants.BOT_CONVERSATION_TIMEOUT_MS),
		errors: ['time'],
		filter: async (reaction, user: User) => {
			return ['👍', '❌', '📝', 'ℹ️'].includes(reaction.emoji.name) && !user.bot;
		},
	}).then(async collected => {
		const message = params[0];
		const botConvo = params[1];
		const scoapEmbed = params[2];
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			switch (option) {
			case 'SET_ROLES':
				return botConvo.setCurrentMessageFlowIndex('2', message.channel);
			case 'PUBLISH':
				return publishScoapPoll(message, scoapEmbed, botConvo);
			}
		} else if (reaction.emoji.name === '❌') {
			switch (option) {
			case 'SET_ROLES':
				return abortSetScoapRoles(message, botConvo.getUserId());
			case 'PUBLISH':
				return abortPublishScoapPoll(message, botConvo, scoapEmbed);
			}
		} else if (reaction.emoji.name === 'ℹ️') {
			await message.channel.send({ embeds: botConvo.getConvo().help_message_embeds });
			return initiateScoapDraft(botConvo);
		} else if (reaction.emoji.name === '📝') {
			const edit_message_object = scoapEmbedEdit(scoapEmbed);
			const select_input_msg = await message.channel.send(edit_message_object);
			botConvo.setCurrentMessage(select_input_msg);
		}
	}).catch(_ => {
		console.log(_);
		console.log('did not react');
		// params[1].getCurrentChannel().send('Conversation timed out. please try again.');
		// try {
		// 	delete scoapEmbedState[params[2].getId()];
		// } catch {
		// 	return;
		// }
		// delete botConvoState[params[1].getUserId()];
	});
};

export const publishDraftScoapEmbed = async (botConvo, scoapEmbed, channel): Promise<any> => {
	const verifyMessage = await channel.send({ embeds: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentMessage(verifyMessage);
	await verifyMessage.react('👍');
	await verifyMessage.react('📝');
	await verifyMessage.react('❌');

	return handleScoapDraftReaction('PUBLISH', [verifyMessage, botConvo, scoapEmbed]);
};


const initiateScoapDraft = async (botConvo: any): Promise<any> => {
	await botConvo.setCurrentMessageFlowIndex('1', botConvo.getCurrentChannel());
	const message = botConvo.getCurrentMessage();
	await message.react('👍');
	await message.react('ℹ️');
	await message.react('❌');
	return handleScoapDraftReaction('SET_ROLES', [message, botConvo]);
};

const createBotConversation = async (guildMember: GuildMember): Promise<any> => {
	const channel = await guildMember.createDM();
	const botConvo = new BotConversation();
	botConvo.setTimeout(+new Date())
		.setConvo(createBotConversationParams(guildMember))
		.setCurrentChannel(channel)
		.setEdit(false)
		.setUserId(guildMember.user.id);
	botConvoState[guildMember.user.id] = botConvo;
	return botConvo;
};

const abortSetScoapRoles = async (message: Message, user_id) => {
	delete botConvoState[user_id];
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const publishScoapPoll = async (message: Message, scoapEmbed: any, botConvo: any): Promise<any> => {
	scoapEmbed.getEmbed()[0].footer = { text: 'react with emoji to claim a project role | ❌ - abort poll' };
	const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
	scoapEmbed.setBotConvoResponseRecord(botConvo.getConvo().user_response_record);
	delete botConvoState[botConvo.getUserId()];
	ScoapPoll(scoapChannel, scoapEmbed);
	message.channel.send(`All done! Your SCOAP Squad assemble request has been posted in <#${channelIds.scoapSquad}>`);
	const notion_inputs = {
		title: scoapEmbed.getEmbed()[0].title,
		author: scoapEmbed.getEmbed()[0].author.name,
		summary: scoapEmbed.getEmbed()[0].fields.find(o => o.name === 'Summary').value,
	};
	const notion_page_id = await createNewScoapOnNotion(notion_inputs);
	scoapEmbed.setNotionPageId(notion_page_id);
};

const abortPublishScoapPoll = async (message: Message, botConvo: any, scoapEmbed: any) => {
	delete scoapEmbedState[scoapEmbed.getId()];
	delete botConvoState[botConvo.getUserId()];
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

// const clearArray = async (array, message) => {
// 	const removeIndex = array.map(item => item.getCurrentChannel()).indexOf(message.channel);
// 	~removeIndex && array.splice(removeIndex, 1);
// };

const createBotConversationParams = (guildMember: GuildMember) => {
	const convo = {
		message_flow: {
			'1': [{
				title: 'Welcome to SCOAP Squad Assemble!',
				fields: [
					{
						name: '\u200b',
						value:
							'I will walk you through ' +
							'the creation of your SCOAP Squad. ' +
							'If you want to learn more about the setup process ' +
							'and what the final product will look like, ' +
							'click the **help** emoji. ',
					},
				],
				footer: { text: '👍 - start | ℹ️ - help | ❌ - cancel' },
			}],
			'2': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'What is the title of your project?',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'3': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'Write a short summary of your project:',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'4': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'Enter a reward (e.g. 1000 BANK) or respond with **!skip** to skip this step',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'5': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'Let\'s go over your project roles. You\'ll give each role a title, and ' +
							 'specify how many people you\'ll need ' +
							 'to fill each role in the proceeding prompts. ' +
							 'How many roles do you want to define? ',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'6': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'Title of role ',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'7': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'How many people do you need in this role? ',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
			'8': [{
				color: '#0099ff',
				fields: [
					{
						name: '\u200b',
						value: 'SCOAP Squad setup complete. Below you can see the layout. ' +
							   'If you want to make changes you can do so now by hitting the edit emoji. ' +
							   '**Once you hit publish, editing will no longer be possible**',
					},
				],
				footer: { text: constants.SCOAP_SQUAD_EMBED_SPACER },
			}],
		},
		commands: ['!cancel', '!help', '!skip'],
		user_response_record: {
			embed: [{
				title: '',
				author: {
					icon_url: guildMember.user.avatarURL(),
					name: guildMember.user.tag,
				},
				fields: [],
				footer: { text: '👍 - publish | 📝 - edit | ❌ - delete' },
			}],
			number_of_roles: 0,
			user: guildMember.user,
		},
		help_message_embeds: [
			{
				title: 'SCOAP Squad Assemble Command Help',
				fields: [
					{
						name: 'About',
						value: 'The SCOAP Squad Assemble is a way to ' +
							   'rapidly create a team for a specific task. ' +
							   'Think of it as putting all the ' +
							   'amazing talent found in the DAO at your fingertips. ',
					},
					{
						name: 'The /scoap-squad assemble Command',
						value: 'The command invokes a bot conversation ' +
							   'which walks you through the process of ' +
							   'creating a poll which will be posted ' +
							   'in the <#872270622070308895> channel. ' +
							   'You will define a project title, a short summary, ' +
							   'the project roles you want to fill, as well as how ' +
							   'many people you want for each role. ' +
							   'Optionally you can also set a reward to boost participation in your project.',
					},
					{
						name: 'An Example',
						value: 'Below you can see an example of what the command output looks like. ' +
							   'Once posted ' +
							   'in the <#872270622070308895> channel, ' +
							   'people can start claiming project roles. ' +
							   'The progress fields will be updated automatically to reflect current claims. ' +
							   'Once all roles are filled, a project page for your SCOAP squad ' +
							   'will be created on notion and the results of the poll will be posted there. ' +
							   'A link to the project page will be sent to all participants.',
					},
				],
				footer: { text: 'Example 👇 👇 👇' },
			},
			{
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
						name: '0%0/2',
						value: '☝️ You are looking for two designers. This field also shows the progress, once roles get filled',
						inline: true,
					},
					{
						name: '\u200b',
						value: '\u200b',
						inline: false,
					},
				],
				timestamp: new Date(),
				footer: { text: 'react with emoji to claim a project role | ❌ - abort poll' },
			}],
	};
	return convo;
};