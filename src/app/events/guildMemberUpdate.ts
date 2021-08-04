/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { GuildMember } from 'discord.js';
import handleGuestPassUpdate from './guest-pass/handleGuestPassUpdate';

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		return handleGuestPassUpdate(oldMember, newMember);
	},
};