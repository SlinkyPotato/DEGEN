import { GuildMember } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import ServiceUtils from '../utils/ServiceUtils';

export default class implements DiscordEvent {
	name = 'guildMemberAdd';
	once = false;

	async execute(member: GuildMember): Promise<any> {
		try {
			if (ServiceUtils.isBanklessDAO(member.guild)) {
				if (await ServiceUtils.runUsernameSpamFilter(member)) {
					return;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}
}