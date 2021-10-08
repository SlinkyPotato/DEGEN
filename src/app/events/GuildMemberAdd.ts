import { GuildMember } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import ServiceUtils from '../utils/ServiceUtils';
import discordServerIds from '../service/constants/discordServerIds';

export default class implements DiscordEvent {
	name = 'guildMemberAdd';
	once = false;

	async execute(member: GuildMember): Promise<any> {
		try {
			if (member.guild.id == discordServerIds.banklessDAO || member.guild.id == discordServerIds.discordBotGarage) {
				if (await ServiceUtils.runUsernameSpamFilter(member)) {
					return;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}
}