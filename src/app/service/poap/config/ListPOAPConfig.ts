import { CommandContext, MessageOptions as MessageOptionsSlash, EmbedField as EmbedFieldSlash } from 'slash-create';
import { GuildMember, Role, EmbedField, MessageOptions } from 'discord.js';
import ServiceUtils from '../../../utils/ServiceUtils';
import ValidationError from '../../../errors/ValidationError';
import { Collection as MongoCollection, Cursor, Db } from 'mongodb';
import { POAPAdmin } from '../../../types/poap/POAPAdmin';
import constants from '../../constants/constants';
import MongoDbUtils from '../../../utils/MongoDbUtils';
import Log from '../../../utils/Log';

const ListPOAPConfig = async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send({ content: 'Please try configuration within discord channel', ephemeral: true });
		return;
	}
	
	if (!(ServiceUtils.isDiscordAdmin(guildMember) || ServiceUtils.isDiscordServerManager(guildMember))) {
		throw new ValidationError('Sorry, only discord admins and managers can view poap settings.');
	}
	
	Log.debug(`${guildMember.user.tag} is authorized to use /poap config list`);
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'I can show you the list of authorized roles and users for POAP commands!');
	
	if (isDmOn) {
		await ctx.send({ content: 'I just send you a DM!', ephemeral: true });
	} else {
		await ctx.send({ content: '⚠ **Please make sure this is a private channel.** I can show you the list of authorized roles and users for POAP commands!', ephemeral: true });
	}
	
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapAdminDb: MongoCollection<POAPAdmin> = dbInstance.collection(constants.DB_COLLECTION_POAP_ADMINS);
	Log.debug('looking for authorized poap users and roles');
	const authorizedUsersAndRolesCursor: Cursor<POAPAdmin> = poapAdminDb.find({
		discordServerId: guildMember.guild.id,
	});
	
	const authorizedRoles: EmbedField[] | EmbedFieldSlash[] = [];
	const authorizedUsers: EmbedField[] | EmbedFieldSlash[] = [];
	
	while (await authorizedUsersAndRolesCursor.hasNext()) {
		const poapAdmin: POAPAdmin | null = await authorizedUsersAndRolesCursor.next();
		if (poapAdmin == null) {
			continue;
		}
		if (poapAdmin.objectType == 'USER') {
			const poapAdminMember: GuildMember = await guildMember.guild.members.fetch(poapAdmin.discordObjectId);
			authorizedUsers.push({
				name: `${poapAdminMember.user.tag}`, value: `${poapAdminMember.user.id}`, inline: true,
			});
		} else if (poapAdmin.objectType == 'ROLE') {
			const poapAdminRole: Role | null = await guildMember.guild.roles.fetch(poapAdmin.discordObjectId);
			if (poapAdminRole == null) {
				continue;
			}
			authorizedRoles.push({
				name: `${poapAdminRole.name}`, value: `${poapAdminRole.id}`, inline: true,
			});
		}
	}
	Log.debug('finished processing discord users and roles');
	
	if (authorizedUsers.length <= 0 && authorizedRoles.length <= 0) {
		const notConfiguredMsg = 'POAP command access not yet configured!';
		if (isDmOn) {
			await guildMember.send({ content: notConfiguredMsg }).catch(Log.error);
		} else {
			await ctx.send({ content: notConfiguredMsg, ephemeral: true }).catch(Log.error);
		}
		Log.debug('Discord server not yet configured');
		return;
	}
	
	if (authorizedUsers.length > 0) {
		const userTitle = 'Authorized POAP Users';
		const userDescription = 'List of authorized users that can use the POAP commands.';
		const authorizedUsersMsg: MessageOptionsSlash | MessageOptions = ServiceUtils.generateEmbedFieldsMessage(isDmOn, authorizedUsers, userTitle, userDescription);
		if (isDmOn) {
			await guildMember.send(authorizedUsersMsg as MessageOptions).catch(Log.error);
		} else {
			await ctx.sendFollowUp(authorizedUsersMsg as MessageOptionsSlash).catch(Log.error);
		}
	}
	
	if (authorizedRoles.length > 0) {
		const roleTitle = 'Authorized POAP Roles';
		const roleDescription = 'List of authorized roles that can use the POAP commands.';
		const authorizedRolesMsg: MessageOptionsSlash | MessageOptions = ServiceUtils.generateEmbedFieldsMessage(isDmOn, authorizedRoles, roleTitle, roleDescription);
		if (isDmOn) {
			await guildMember.send(authorizedRolesMsg as MessageOptions).catch(Log.error);
		} else {
			await ctx.sendFollowUp(authorizedRolesMsg as MessageOptionsSlash).catch(Log.error);
		}
	}
	
	Log.debug('list of authorized users and roles sent');
};

export default ListPOAPConfig;
