import { GuildMember, Message, MessageEmbedOptions, MessageReaction, Role } from 'discord.js';
import ValidationError from '../../errors/ValidationError';
import { Collection } from '@discordjs/collection';
import { Snowflake } from 'discord-api-types';

export default async (guildMember: GuildMember, roles?: string[], users?: string[]): Promise<any> => {
	// TODO: uncomment before raising PR
	// if (guildMember.guild.ownerId != guildMember.id) {
	// 	throw new ValidationError('Sorry, only the discord owner can configure poap distribution.');
	// }
	const authorizedRoles: Role[] = await retrieveRoles(guildMember, roles);
	const authorizedUsers: GuildMember[] = await retrieveUsers(guildMember, users);

	if (authorizedRoles.length == 0 && authorizedUsers.length == 0) {
		throw new ValidationError('Please try again with at least 1 discord user or role.');
	}
	const intro: MessageEmbedOptions = {
		title: 'POAP Configuration',
		description: 'Welcome to POAP configuration.\n\n' +
			'This is used as a first-time setup of POAP commands. This series of ' +
			'questions will help assign or remove authorized users and roles for POAP distribution.\n\n' +
			'Authorized users will have access to a list of participants after the event has ended. They will also be ' +
			'able to send out mass messages to those participants.',
		footer: {
			text: '@Bankless DAO 🏴',
		},
	};
	await guildMember.send({ embeds: [intro] });
	const isApproval: boolean = await askForGrantOrRemoval(guildMember, authorizedRoles, authorizedUsers);
	if (isApproval) {
		
	} else {
		
	}
	return;
};

export const askForGrantOrRemoval = async (guildMember: GuildMember, authorizedRoles: Role[], authorizedUsers: GuildMember[]): Promise<boolean> => {
	const fields = [];
	for (const role of authorizedRoles) {
		fields.push({
			name: 'Role',
			value: role.name,
			inline: true,
		});
	}
	for (const member of authorizedUsers) {
		fields.push({
			name: 'User',
			value: member.user.tag,
			inline: true,
		});
	}
	const whichRolesAreAllowedQuestion: MessageEmbedOptions = {
		title: 'Give or remove access?',
		description: 'Should the given list of users and roles be given access or remove?',
		fields: fields,
		timestamp: new Date().getTime(),
		footer: {
			text: '👍 - approve | ❌ - remove | 📝 - edit | Please reply within 60 minutes',
		},
	};
	
	const message: Message = await guildMember.send({ embeds: [whichRolesAreAllowedQuestion] });
	await message.react('👍');
	await message.react('❌');
	await message.react('📝');
	
	const collected: Collection<Snowflake | string, MessageReaction> = await message.awaitReactions({
		max: 1,
		time: (6000 * 60),
		errors: ['time'],
		filter: async (reaction, user) => {
			return ['👍', '❌', '📝'].includes(reaction.emoji.name) && !user.bot;
		},
	});
	const reaction: MessageReaction = collected.first();
	if (reaction.emoji.name === '👍') {
		console.log('/poap config add');
		return true;
	} else if (reaction.emoji.name === '❌') {
		console.log('/poap config remove');
		return false;
	} else if (reaction.emoji.name === '📝') {
		console.log('/poap config edit');
		await guildMember.send({ content: 'Configuration setup ended.' });
		throw new ValidationError('Please re-initiate poap configuration.');
	}
	throw new ValidationError('Please approve or deny access.');
};

export const retrieveRoles = async (guildMember: GuildMember, authorizedRoles: string[]): Promise<Role[]> => {
	const roles: Role[] = [];
	for (const authRole of authorizedRoles) {
		if (authRole == null) continue;
		try {
			const roleManager: Role = await guildMember.guild.roles.fetch(authRole);
			roles.push(roleManager);
		} catch (e) {
			console.error(e);
		}
	}
	return roles;
};

export const retrieveUsers = async (guildMember: GuildMember, authorizedUsers: string[]): Promise<GuildMember[]> => {
	const users: GuildMember[] = [];
	for (const authUser of authorizedUsers) {
		if (authUser == null) continue;
		try {
			const member: GuildMember = await guildMember.guild.members.fetch(authUser);
			users.push(member);
		} catch (e) {
			console.error(e);
		}
	}
	return users;
};
