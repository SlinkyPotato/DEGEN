import { GuildMember } from 'discord.js';
import roleIDs from '../../service/constants/roleIDs';
import AddGuestPass from '../../service/guest-pass/AddGuestPass';
import RemoveGuestPass from '../../service/guest-pass/RemoveGuestPass';

export default async (oldMember: GuildMember, newMember: GuildMember): Promise<any> => {
	const newMemberHasGuestPass: boolean = newMember.roles.cache.some(role => role.id === roleIDs.guestPass);
	const oldMemberHasGuestPass = oldMember.roles.cache.some(role => role.id === roleIDs.guestPass);
	const isGuestAdded: boolean = (newMemberHasGuestPass && !oldMemberHasGuestPass);
	const isGuestRemoved: boolean = (!newMemberHasGuestPass && oldMemberHasGuestPass);
	if (isGuestAdded) {
		return AddGuestPass(newMember);
	} else if (isGuestRemoved) {
		return RemoveGuestPass(newMember);
	}
	console.log('no guest pass role change occurred');
};