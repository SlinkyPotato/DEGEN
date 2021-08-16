import { GuildMember } from 'discord.js';
import AddGuestPass from '../../service/guest-pass/AddGuestPass';

export default async (newMember: GuildMember): Promise<any> => {
	return AddGuestPass(newMember);
};