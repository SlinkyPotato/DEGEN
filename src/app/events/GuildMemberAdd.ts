import { GuildMember } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import ServiceUtils from '../utils/ServiceUtils';
import { LogUtils } from '../utils/Log';
import LaunchFirstQuest from '../service/first-quest/LaunchFirstQuest';

export default class implements DiscordEvent {
	name = 'guildMemberAdd';
	once = false;

	async execute(member: GuildMember): Promise<any> {
		try {
			if (ServiceUtils.isBanklessDAO(member.guild)) {
				if (await ServiceUtils.runUsernameSpamFilter(member)) {
					return;
				} else {
					const guild = member.guild;
					const roles = await guild.roles.fetch();
					for (const role of roles.values()) {
						if (role.name === 'unverified') {
							await member.roles.add(role);
							await LaunchFirstQuest(member, 'undefined').catch(e => {
								console.error('ERROR: ', e);
							});
						}
					}
				}
			}
		} catch (e) {
			LogUtils.logError('failed process event guildMemberAdd', e);
		}
	}
}