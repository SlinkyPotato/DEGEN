import ServiceUtils from '../../utils/ServiceUtils';
import { sendFqMessage, switchRoles } from '../../service/first-quest/LaunchFirstQuest';
import { Message } from 'discord.js';
import fqConstants from '../../service/constants/firstQuest';
import Log from '../../utils/Log';

export default async (message: Message): Promise<any> => {
	// gate everything that is not first-quest command
	if (!(['!first-quest'].includes(message.content))) return;

	const guilds = await message.client.guilds.fetch();

	for (const oAuth2Guild of guilds.values()) {
		const guild = await oAuth2Guild.fetch();

		const guildMembers = await guild.members.fetch();

		for (let member of guildMembers.values()) {
			if (member.partial) {
				member = await member.fetch();
			}
			if ((member.user === message.author) && ServiceUtils.isBanklessDAO(guild)) {
				if (member.roles.cache.size <= 1) return;
				
				try {
					if (!await member.roles.cache.find(role => role.id === fqConstants.FIRST_QUEST_ROLES.first_quest_complete)) {
						return await sendFqMessage(message.channel, member).catch(e => {
							Log.error('ERROR: ', e);
						});
					} else {
						await switchRoles(member, fqConstants.FIRST_QUEST_ROLES.first_quest_complete, fqConstants.FIRST_QUEST_ROLES.verified);
						try {
							return await sendFqMessage(message.channel, member).catch(e => {
								Log.error('ERROR: ', e);
							});

						} catch {
							await new Promise(r => setTimeout(r, 1000));

							return await sendFqMessage(message.channel, member).catch(e => {
								Log.error('ERROR: ', e);
							});
						}
					}
				} catch {
					Log.error('something went wrong here');
				}
			}
		}

	}
};
