import { GuildMember, Message, User } from 'discord.js';
import ServiceUtils from '../../utils/ServiceUtils';
import { PublishAFKMessage } from '../../service/AFK/PublishAFKMessage';

const HandleAFK = async (message: Message): Promise<any> => {
	// check afk role exists in message.guild
	const AFKRole = ServiceUtils.getRoleId(message.guild.roles, 'AFK');
	if (!AFKRole) {
		return;
	}
	// if it does exist, create array of mentioned Users
	const arrayOfUsers: User[] = message.mentions.users.map(
		(value) => value,
	);
	// get GuildMember from User, check for AFK role, send message if user has AFK role
	for (let i = 0; i <= arrayOfUsers.length; i++) {
		const user: User = arrayOfUsers[i];
		const guildMember: GuildMember = message.guild.members.cache.find(member => { return member.user.username === user.username;});
		if (ServiceUtils.hasRole(guildMember, AFKRole.id)) {
			message.channel.send({
				content: `${guildMember.user.username} is AFK!`,
			});
			const prettyMessage = PublishAFKMessage(message.author.username, message.content, message.guildId, message.channelId, message.id);
			
			await guildMember.send({ embeds :[prettyMessage] });
		}
	}
};

export default HandleAFK;