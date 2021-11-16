import { MessageEmbedOptions } from 'discord.js';

export const PublishAFKMessage = (username: string, content: string, guildId: string, channelId: string, id: string) : MessageEmbedOptions => {
	return {
		color: 1998388,
		title: `${username} mentioned you!`,
		timestamp: new Date().getTime(),
		description: content,
		url: `https://discord.com/channels/${guildId}/${channelId}/${id}`,
		footer: {
			text: 'Brought to you by DEGEN',
		},
	};
};