/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { updateNotionGuestPassDatabase } from '../service/GuestPassService';
import constants from '../constants';
import { GuildMember } from 'discord.js';

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		// Check if member roles were updated
		if (oldMember.roles !== newMember.roles) {
			console.log(`role updated for username: ${newMember.user.username}`);
			// Check if guest pass was added or removed
			const newMemberHasGuestPass = newMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
			const oldMemberHasGuestPass = oldMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
			const isNowActive: boolean = (newMemberHasGuestPass && !oldMemberHasGuestPass);
			console.log(`guest pass active for username ${newMember.user.username}: ${isNowActive}`);
			updateNotionGuestPassDatabase(newMember.user.tag, isNowActive);
		}
	},
};