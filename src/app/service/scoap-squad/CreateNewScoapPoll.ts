import { CommandContext, User } from 'slash-create';
import ScoapUtils from '../../utils/ScoapUtils';
import { GuildMember, Message, MessageOptions, MessageReaction } from 'discord.js';
// import { setScoapRoles } from './SetRolesCommandScoap';
import { ScoapEmbed } from './ScoapClasses';
// import cloneDeep from 'lodash.clonedeep';

// const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

// export const scoapEmbed = new ScoapEmbed();

export const scoapEmbedArray = [];

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
		return ['📝', '👍', '❌'].includes(reaction.emoji.name) && !user.bot;
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

	const roleMessage: Message = await guildMember.send(
		'Please define at least one role for your SCOAP squad. ' +
		'Reply to this message with the name of the first role (e.g. Project Manager)') as Message;

	return roleMessage;


};