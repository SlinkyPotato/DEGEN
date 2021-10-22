import ServiceUtils from '../../utils/ServiceUtils';
import { sendFqMessage, switchRoles } from '../../service/first-quest/LaunchFirstQuest';
import LaunchFirstQuest from '../../service/first-quest/LaunchFirstQuest';
import { Message } from "discord.js";
import constants from '../../service/constants/constants';

export default async (message: Message): Promise<any> => {
	// gate everything that is not first-quest command
	if (!(['!first-quest', '!verification'].includes(message.content))) return;

	const guilds = await message.client.guilds.fetch();

	for (const oAuth2Guild of guilds.values()) {
		const guild = await oAuth2Guild.fetch();

		if (ServiceUtils.isBanklessDAO(guild)) {
			const guildMembers = await guild.members.fetch();

			for (const member of guildMembers.values()) {
				if (message.content === '!verification') {
					try {
						const fqUnverified = await member.roles.cache.find(role => role.name === constants.FIRST_QUEST_ROLES.unverified);

						if ( fqUnverified.name === constants.FIRST_QUEST_ROLES.unverified) {
							return await LaunchFirstQuest(member, message.channel).catch(e => {
								console.error('ERROR: ', e);
							});
						}
					} catch {
						return await message.channel.send({content: 'You are already verified. if you want to run first-quest, try !first-quest'});
					}
				}

				try {
					const isWelcome = await member.roles.cache.find(role => {
						return ( (Object.values(constants.FIRST_QUEST_ROLES).indexOf(role.name) > -1) && (role.name !== constants.FIRST_QUEST_ROLES.unverified) );
					});

					if ((member.user === message.author) && isWelcome) {
						try {
							const fqCompleted = await member.roles.cache.find(role => role.name === constants.FIRST_QUEST_ROLES.first_quest_complete);

							if ( fqCompleted.name === constants.FIRST_QUEST_ROLES.first_quest_complete) {
								await switchRoles(member, constants.FIRST_QUEST_ROLES.first_quest_complete, constants.FIRST_QUEST_ROLES.verified);

								await new Promise(r => setTimeout(r, 500));
							}

						} catch {
							return await sendFqMessage(message.channel, member).catch(e => {

								console.error('ERROR: ', e);
							});
						}
					}
				} catch {
					console.error('something went wrong here')
				}
			}
			return;
		}
	}
};