import ServiceUtils from '../../utils/ServiceUtils';
import { sendFqMessage } from '../../service/first-quest/LaunchFirstQuest';
import LaunchFirstQuest from '../../service/first-quest/LaunchFirstQuest';
import { Message } from "discord.js";

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
					return await LaunchFirstQuest(member, message.channel);
				}

				const isWelcome = await member.roles.cache.find(role => {
					return [
						'verified',
						'First Quest Welcome',
						'First Quest Membership',
						'Firehose',
						'First Quest Scholar',
						'First Quest Guest Pass',
						'First Quest',
						'First Quest Complete',
					].includes(role.name);
				});

				if ((member.user === message.author) && isWelcome) {
					await sendFqMessage(message.channel, member).catch(e => {

						console.error('ERROR: ', e);
					});
				}
			}
		}
	}
};