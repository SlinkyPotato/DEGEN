/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { updateNotionGuestPassDatabase } from '../service/GuestPassService';
import constants from '../constants';

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember, newMember) {
		// Check if member roles were updated
		if (oldMember.roles !== newMember.roles) {
			// Check if guest pass was added or removed
			const newMemberHasGuestPass = newMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
			const oldMemberHasGuestPass = oldMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
			if (newMemberHasGuestPass && !oldMemberHasGuestPass) {
				// Guest pass was added
				updateNotionGuestPassDatabase(newMember.user.tag, true);
			}
			else if (oldMemberHasGuestPass && !newMemberHasGuestPass) {
				// Guest pass was removed
				updateNotionGuestPassDatabase(newMember.user.tag, false);
			}
		}
	},
};