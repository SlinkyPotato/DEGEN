/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { Collection, GuildMember, Role, Snowflake } from 'discord.js';
import roleIds from '../service/constants/roleIds';
import AddGuestPass from '../service/guest-pass/AddGuestPass';
import RemoveGuestPass from '../service/guest-pass/RemoveGuestPass';
import sendGuildWelcomeMessage from './welcomeMats/guildMats';

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
		if (removedRoles.size > 0) {
			console.debug(`The roles ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName}.`);
			handleRolesRemoved(newMember, removedRoles);
			return;
		}

		const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
		if (addedRoles.size > 0) {
			console.debug(`The roles ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName}.`);
			handleRolesAdded(newMember, addedRoles);
		}
	},
};

/**
 * Handler for when roles are added to a member.
 * 
 * @param guildMember member that roles were added to
 * @param roles roles that were added to member
 */
export const handleRolesAdded = (guildMember: GuildMember, roles: Collection<Snowflake, Role>): void => {
	roles.each(role => {
		switch (role.id) {
		case roleIds.guestPass:
			AddGuestPass(guildMember).catch(err => console.error(err));
			break;
		case roleIds.developersGuild:
			sendGuildWelcomeMessage.devGuildMat(guildMember).catch(err => console.error(err));
			break;
		}
	});
};

/**
 * Handler for when roles are removed from a member.
 * 
 * @param guildMember member that roles were removed from
 * @param roles roles that were removed from member
 */
export const handleRolesRemoved = (guildMember: GuildMember, roles: Collection<Snowflake, Role>): void => {
	roles.each(role => {
		switch (role.id) {
		case roleIds.guestPass:
			RemoveGuestPass(guildMember).catch(err => console.error(err));
			break;
		}
	});
};