import { GuildMember } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import { LogUtils } from '../utils/Log';
import { firstQuestHandleUserRemove } from '../service/first-quest/LaunchFirstQuest';
import ServiceUtils from '../utils/ServiceUtils';

export default class implements DiscordEvent {
	name = 'guildMemberRemove';
	once = false;

	async execute(member: GuildMember): Promise<any> {
		try {
			if (ServiceUtils.isBanklessDAO(member.guild)) {
				if (member.partial) {
					member = await member.fetch();
				}

				await firstQuestHandleUserRemove(member);
			}
		} catch (e) {
			LogUtils.logError('failed process event guildMemberAdd', e);
		}
	}
}