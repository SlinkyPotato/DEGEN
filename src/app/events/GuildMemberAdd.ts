import {
	GuildMember,
} from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import Log, { LogUtils } from '../utils/Log';
import constants from '../service/constants/constants';

class GuildMemberAdd implements DiscordEvent {
	name = 'guildMemberAdd';
	once = false;
	
	async execute(member: GuildMember): Promise<any> {
		try {
			// check if DEGEN was invited, if so then make old legacy degen leave
			if (member && member.id == constants.NEW_DEGEN_ID) {
				await member.guild.leave();
				Log.info('DEGEN found, legacy DEGEN left');
			}
		} catch (e) {
			LogUtils.logError('failed to process event rateLimit', e);
		}
	}
}

export default GuildMemberAdd;