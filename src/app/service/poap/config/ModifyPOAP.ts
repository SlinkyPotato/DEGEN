import {
	GuildMember,
	Message,
	MessageEmbedOptions,
	MessageOptions,
	MessageReaction,
	Role,
	TextChannel,
} from 'discord.js';
import ValidationError from '../../../errors/ValidationError';
import { Collection } from '@discordjs/collection';
import {
	BulkWriteError,
	Collection as MongoCollection, CollectionInsertManyOptions,
	InsertWriteOpResult,
	MongoError,
} from 'mongodb';
import { Snowflake } from 'discord-api-types';
import { Db } from 'mongodb';
import constants from '../../constants/constants';
import { POAPAdmin } from '../../../types/poap/POAPAdmin';
import ServiceUtils from '../../../utils/ServiceUtils';
import { CommandContext, Message as MessageSlash, MessageEmbedOptions as MessageEmbedOptionsSlash } from 'slash-create';
import Log, { LogUtils } from '../../../utils/Log';
import MongoDbUtils from '../../../utils/MongoDbUtils';
import { MessageOptions as MessageOptionsSlash } from 'slash-create/lib/structures/interfaces/messageInteraction';
import dayjs from 'dayjs';

export default async (ctx: CommandContext, guildMember: GuildMember, roles?: string[], users?: string[]): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send({ content: 'Please try configuration within discord channel', ephemeral: true });
		return;
	}
	
	if (!(ServiceUtils.isDiscordAdmin(guildMember) || ServiceUtils.isDiscordServerManager(guildMember))) {
		throw new ValidationError('Sorry, only discord admins and managers can configure poap settings.');
	}
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'I can help you configure authorized users for the POAP commands!');
	if (isDmOn) {
		await ctx.sendFollowUp({ content: 'I just send you a DM!', ephemeral: true });
	} else {
		await ctx.sendFollowUp('⚠ **Please make sure this is a private channel.** I can help you configure authorized users for the POAP commands!');
	}
	
	const authorizedRoles: Role[] = await retrieveRoles(guildMember, roles);
	const authorizedUsers: GuildMember[] = await retrieveUsers(guildMember, users);

	if (authorizedRoles.length == 0 && authorizedUsers.length == 0) {
		throw new ValidationError('Please try again with at least 1 discord user or role.');
	}
	const intro: MessageEmbedOptions | MessageEmbedOptionsSlash = {
		title: 'POAP Configuration',
		description: 'Welcome to POAP configuration.\n\n' +
			'This is used as a first-time setup of POAP commands. I can help assign or remove authorized users and ' +
			'roles for POAP distribution.\n\n' +
			'Authorized users will have access to a list of participants after the event has ended. They will also be ' +
			'able to send out mass messages to those participants.',
		footer: {
			text: '@Bankless DAO 🏴',
		},
	};

	const isApproval: boolean = await askForGrantOrRemoval(ctx, guildMember, authorizedRoles, authorizedUsers, isDmOn, intro);
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	let confirmationMsg;
	if (isApproval) {
		await storePOAPAdmins(guildMember, dbInstance, authorizedUsers, authorizedRoles);
		confirmationMsg = {
			title: 'Configuration Added',
			description: 'The list of users and roles are now authorized to use poap commands.',
		};
	} else {
		await removePOAPAdmins(guildMember, dbInstance, authorizedUsers, authorizedRoles);
		confirmationMsg = {
			title: 'Configuration Removed',
			description: 'The list of users and roles have now been restricted and will not be able to use poap commands.',
		};
	}
	
	const endConfigMsg = {
		embeds: [confirmationMsg],
	};
	await ServiceUtils.sendContextMessage(isDmOn, guildMember, ctx, endConfigMsg);
	return;
};

export const askForGrantOrRemoval = async (
	ctx: CommandContext, guildMember: GuildMember, authorizedRoles: Role[], authorizedUsers: GuildMember[],
	isDmOn: boolean, intro?: MessageEmbedOptions | MessageEmbedOptionsSlash,
): Promise<boolean> => {
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
	let whichRolesAreAllowedQuestion: MessageEmbedOptions | MessageEmbedOptionsSlash = {
		title: 'Give or remove access?',
		description: 'Should the given list of users and roles be given access or should they get removed?',
		fields: fields,
		footer: {
			text: '👍 - approve | ❌ - remove | 📝 - edit | Please reply within 60 minutes',
		},
	};
	
	let msg1: MessageOptions | MessageOptionsSlash;
	if (isDmOn) {
		whichRolesAreAllowedQuestion = whichRolesAreAllowedQuestion as MessageEmbedOptions;
		whichRolesAreAllowedQuestion.timestamp = new Date().getTime();
		msg1 = { embeds: [intro, whichRolesAreAllowedQuestion] } as MessageOptions;
	} else {
		whichRolesAreAllowedQuestion = whichRolesAreAllowedQuestion as MessageEmbedOptionsSlash;
		whichRolesAreAllowedQuestion.timestamp = dayjs().toDate();
		msg1 = { embeds: [intro, whichRolesAreAllowedQuestion] } as MessageOptionsSlash;
	}
	
	let message: Message | MessageSlash = await ServiceUtils.sendContextMessage(isDmOn, guildMember, ctx, msg1);
	
	if (isDmOn) {
		message = message as Message;
	} else {
		const textChannel: TextChannel = await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
		message = await textChannel.messages.fetch(message.id) as Message;
	}
	
	await message.react('👍');
	await message.react('❌');
	
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
		Log.info('/poap config add');
		return true;
	} else if (reaction.emoji.name === '❌') {
		Log.info('/poap config remove');
		return false;
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
			LogUtils.logError('failed to retrieve role from user', e);
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
			LogUtils.logError('failed to retrieve role from user', e);
		}
	}
	return users;
};

export const storePOAPAdmins = async (
	guildMember: GuildMember, dbInstance: Db, authorizedUsers: GuildMember[], authorizedRoles: Role[],
): Promise<any> => {
	const poapAdminDb: MongoCollection<POAPAdmin> = dbInstance.collection(constants.DB_COLLECTION_POAP_ADMINS);
	
	const poapAdminsList = [];
	for (const member of authorizedUsers) {
		poapAdminsList.push({
			objectType: 'USER',
			discordObjectId: member.id,
			discordObjectName: member.user.tag,
			discordServerId: guildMember.guild.id,
			discordServerName: guildMember.guild.name,
		} as POAPAdmin);
	}
	for (const role of authorizedRoles) {
		poapAdminsList.push({
			objectType: 'ROLE',
			discordObjectId: role.id,
			discordObjectName: role.name,
			discordServerId: guildMember.guild.id,
			discordServerName: guildMember.guild.name,
		} as POAPAdmin);
	}
	
	let result: InsertWriteOpResult<POAPAdmin>;
	try {
		result = await poapAdminDb.insertMany(poapAdminsList, {
			ordered: false,
		} as CollectionInsertManyOptions);
	} catch (e) {
		if (e instanceof BulkWriteError && e.code === 11000) {
			LogUtils.logError('dup key found, proceeding', e);
		}
		LogUtils.logError('failed to store poap admins from db', e);
		return;
	}
	
	if (result == null) {
		throw new MongoError('failed to insert poapAdmins');
	}
};

export const removePOAPAdmins = async (
	guildMember: GuildMember, db: Db, authorizedUsers: GuildMember[], authorizedRoles: Role[],
): Promise<any> => {
	const poapAdminDb: MongoCollection = db.collection(constants.DB_COLLECTION_POAP_ADMINS);
	try {
		for (const member of authorizedUsers) {
			await poapAdminDb.deleteOne({
				objectType: 'USER',
				discordObjectId: member.id,
				discordServerId: guildMember.guild.id,
			});
		}
		for (const role of authorizedRoles) {
			await poapAdminDb.deleteOne({
				objectType: 'ROLE',
				discordObjectId: role.id,
				discordServerId: guildMember.guild.id,
			});
		}
	} catch (e) {
		LogUtils.logError('failed to remove poap admins from db', e);
	}
};

