import ValidationError from '../../errors/ValidationError';
import Log from '../../utils/Log';
import { Guild } from 'discord.js';


export default async (guild: Guild): Promise<any> => {
	if (guild.id === null) {
		throw new ValidationError(`No guildMember <@${guild.id}>.`);
	}
	try {
		const createAFKRole = await guild.roles.create({ name: 'AFK', color: 'GREY', reason: 'People need a break!' });
		if (createAFKRole.name === 'AFK') {
			return true;
		} else {
			return false;
		}
	} catch (e) {
		Log.error(`toggleAFKRoll error: ${e}`);
	}
};

