import { GuildMember, Message } from 'discord.js';
import ServiceUtils from '../../utils/ServiceUtils';
import { PublishAFKMessage } from '../../service/AFK/PublishAFKMessage';
import { AFKMentionResponse } from '../../service/AFK/AFKMentionResponse';

const HandleAFK = async (message: Message): Promise<any> => {
	const AFKRole = ServiceUtils.getAFKRole(message.guild.roles);
	if (!AFKRole) {
		return;
	}
	message.mentions.users.forEach(async user => {
		const guildMember: GuildMember = message.guild.members.cache.find(member => {
			return member.user.id === user.id;
		});
		if (ServiceUtils.hasRole(guildMember, AFKRole.id)) {
			message.channel.send({
				content: `${AFKMentionResponse(guildMember.user.username)}`,
			});
			const prettyMessage = PublishAFKMessage(message.author.username, message.content, message.guildId, message.channelId, message.id);
			
			await guildMember.send({ embeds :[prettyMessage] });
		}
	});
};

export default HandleAFK;