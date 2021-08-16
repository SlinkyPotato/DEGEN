/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { Collection, GuildMember, Role, Snowflake } from 'discord.js';
import constants from '../service/constants/constants';
import addGuestPass from './guest-pass/addGuestPass';
import removeGuestPass from './guest-pass/removeGuestPass';
import sendGuildWelcomeMessage from './welcomeMats/devGuild';

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		console.debug('Guild member updated')
		const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
		if (removedRoles.size > 0) { 
			console.debug(`The roles ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName}.`);
			module.exports.handleRolesRemoved(oldMember, newMember, removedRoles);
		}

		const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
		if (addedRoles.size > 0) {
			console.debug(`The roles ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName}.`);
			module.exports.handleRolesAdded(oldMember, newMember, addedRoles);
		}
	},

	/**
	 * Handler for when roles are added to a member.
	 * 
	 * @param guildMember member that roles were added to
	 * @param roles roles that were added to member
	 */
	handleRolesAdded(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					try {
						addGuestPass(guildMember);
					} catch (e) {
						console.error(e);
					}
					break;
				case constants.DISCORD_ROLE_DEVELOPERS_GUILD:
					try {
						sendGuildWelcomeMessage(guildMember);
					} catch(e) {
						console.error(e);
					}
					break;
			}
		});
	},

	/**
	 * Handler for when roles are removed from a member.
	 * 
	 * @param guildMember member that roles were removed from
	 * @param roles roles that were removed from member
	 */
	handleRolesRemoved(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					return removeGuestPass(guildMember);
			}
		});
	},
};