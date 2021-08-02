import { GuildMember } from 'discord.js';

export default async (oldMember: GuildMember, newMember: GuildMember) => {
	// Check guest role was moved
	// then execute RemoveGuestPass()
	
	// or 
	
	// Check if guest role was added
	// then execute AddGeustPass()
	
	// This can probably be deleted
	// if (oldMember.roles !== newMember.roles) {
	// 	console.log(`role updated for username: ${newMember.user.username}`);
	// 	// Check if guest pass was added or removed
	// 	const newMemberHasGuestPass = newMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
	// 	const oldMemberHasGuestPass = oldMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
	// 	const isNowActive: boolean = (newMemberHasGuestPass && !oldMemberHasGuestPass);
	// 	console.log(`guest pass active for username ${newMember.user.username}: ${isNowActive}`);
	// }
};