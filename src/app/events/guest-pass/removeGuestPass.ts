import { GuildMember } from 'discord.js';
import RemoveGuestPass from '../../service/guest-pass/RemoveGuestPass';

export default async (newMember: GuildMember): Promise<any> => {
	return RemoveGuestPass(newMember);
};