import { Message, User, GuildMember } from 'discord.js';
import ServiceUtils from '../../utils/ServiceUtils';
import roleIds from '../../service/constants/roleIds';
import { PublishAFKMessage } from '../../service/AFK/PublishAFKMessage';

const HandleAFK = async (message: Message): Promise<any> => {
	const arrayOfUsers: User[] = message.mentions.users.map(
		(value) => value,
	);
	for (let i = 0; i <= arrayOfUsers.length; i++) {
		const user: User = arrayOfUsers[i];
		const guildMember: GuildMember =
            await ServiceUtils.getGuildMemberFromUser(user, message.guildId);
		if (ServiceUtils.hasRole(guildMember, roleIds.AFK)) {
			message.channel.send({
				content: `${guildMember.user.username} is AFK!`,
			});
			const prettyMessage = PublishAFKMessage(message.author.username, message.content, message.guildId, message.channelId, message.id);
			
			await guildMember.send({ embeds :[prettyMessage] });
		}
	}
};

export default HandleAFK;