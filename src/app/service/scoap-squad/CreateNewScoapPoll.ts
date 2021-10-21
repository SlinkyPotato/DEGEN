import { CommandContext, User } from 'slash-create';
import { GuildMember, Message, MessageReaction, TextChannel, TextBasedChannels } from 'discord.js';
import { BotConversation, ScoapEmbed } from './ScoapClasses';
import constants from '../constants/constants';
import channelIds from '../constants/channelIds';
import client from '../../app';
import ScoapPoll from './ScoapPoll';
import { scoapEmbedState, botConvoState, voteRecordState } from './ScoapDatabase';
import { scoapEmbedEdit } from './EditScoapDraft';
import ScoapUtils from '../../utils/ScoapUtils';
import { createNewScoapOnNotion } from './ScoapNotion';
import { LogUtils } from '../../utils/Log';


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
		filter: async (reaction: MessageReaction, user: User) => {
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
				return await botConvo.setCurrentMessageFlowIndex('2', message.channel);
			case 'PUBLISH':
				return publishScoapPoll(message, scoapEmbed, botConvo);
			}
		} else if (reaction.emoji.name === '❌') {
			switch (option) {
			case 'SET_ROLES':
				return abortSetScoapRoles(message, botConvo.getUserId());
			case 'PUBLISH':
				return abortPublishScoapPoll(message, botConvo);
			}
		} else if (reaction.emoji.name === 'ℹ️') {
			await message.channel.send({ embeds: botConvo.getConvo().help_message_embeds });
			return initiateScoapDraft(botConvo);
		} else if (reaction.emoji.name === '📝') {
			const editMessageObject = scoapEmbedEdit(scoapEmbed);
			const selectInputMessage = await message.channel.send(editMessageObject);
			botConvo.setCurrentMessage(selectInputMessage);
		}
	}).catch(e => {
		LogUtils.logError('did not react', e);
	});
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
	ScoapUtils.logToFile('object added to botConvoState. Reason: createBotConversation \n ' +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	return botConvo;
};

const initiateScoapDraft = async (botConvo: BotConversation): Promise<any> => {
	await botConvo.setCurrentMessageFlowIndex('1', botConvo.getCurrentChannel());
	const message: Message = botConvo.getCurrentMessage();
	await message.react('👍');
	await message.react('ℹ️');
	await message.react('❌');
	return handleScoapDraftReaction('SET_ROLES', [message, botConvo]);
};

export const publishDraftScoapEmbed = async (botConvo: BotConversation, scoapEmbed: ScoapEmbed, channel: TextBasedChannels): Promise<any> => {
	const verifyMessage = await channel.send({ embeds: scoapEmbed.getEmbed() });
	scoapEmbed.setCurrentMessage(verifyMessage);
	await verifyMessage.react('👍');
	await verifyMessage.react('📝');
	await verifyMessage.react('❌');

	return handleScoapDraftReaction('PUBLISH', [verifyMessage, botConvo, scoapEmbed]);
};

const publishScoapPoll = async (message: Message, scoapEmbed: ScoapEmbed, botConvo: BotConversation): Promise<any> => {
	scoapEmbed.getEmbed()[0].footer = { text: 'react with emoji to claim a project role | ❌ - abort poll' };
	const scoapChannel: TextChannel = await client.channels.fetch(channelIds.scoapSquad) as TextChannel;
	scoapEmbed.setBotConvoResponseRecord(botConvo.getConvo().user_response_record);
	delete botConvoState[botConvo.getUserId()];
	ScoapUtils.logToFile('object deleted from botConvoState. Reason: publishScoapPoll \n' +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	await ScoapPoll(scoapChannel, scoapEmbed);
	message.channel.send(`All done! Your SCOAP Squad assemble request has been posted in <#${channelIds.scoapSquad}>`);
	const notionInputs = {
		title: scoapEmbed.getEmbed()[0].title,
		author: scoapEmbed.getEmbed()[0].author.name,
		summary: scoapEmbed.getEmbed()[0].fields.find(o => o.name === 'Summary').value,
	};
	const notionPageId = await createNewScoapOnNotion(notionInputs);
	scoapEmbed.setNotionPageId(notionPageId);
};

const abortSetScoapRoles = async (message: Message, userId: string) => {
	delete botConvoState[userId];
	ScoapUtils.logToFile('object delted from botConvoState. Reason: abortSetScoapRoles \n' +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const abortPublishScoapPoll = async (message: Message, botConvo: BotConversation) => {
	delete botConvoState[botConvo.getUserId()];
	ScoapUtils.logToFile('object deleted from botConvoState. Reason: abortPublishScoapPoll \n ' +
					` scoapEmbedState: ${JSON.stringify(scoapEmbedState)} \n ` +
					` botConvoState: ${JSON.stringify(botConvoState)}  \n` +
					` voteRecordState: ${JSON.stringify(voteRecordState)}`);
	await message.delete();
	return message.channel.send('Message deleted, let\'s start over.');
};

const createBotConversationParams = (guildMember: GuildMember) => {
	return {
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
								`in the <#${channelIds.scoapSquad}> channel. ` +
								'You will define a project title, a short summary, ' +
								'the project roles you want to fill, as well as how ' +
								'many people you want for each role. ' +
								'Optionally you can also set a reward to boost participation in your project.',
					},
					{
						name: 'An Example',
						value: 'Below you can see an example of what the command output looks like. ' +
								'Once posted ' +
								`in the <#${channelIds.scoapSquad}> channel, ` +
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
};