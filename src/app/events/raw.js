/**
 * Handler for Discord event `raw`.
 */

module.exports = {
	name: 'raw',
	once: true,
	
	async execute(packet, client) {
		if (
			!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)
		) {
			return;
		}
		// Grab the channel to check the message from
		const channel = await client.channels.fetch(packet.d.channel_id);
		// don't emit if the message is cached
		if (channel.messages.cache.has(packet.d.message_id)) return;
		channel.messages.fetch(packet.d.message_id).then((message) => {
			// Since we have confirmed the message is not cached, let's fetch it
			const emoji = packet.d.emoji.id
				? `${packet.d.emoji.name}:${packet.d.emoji.id}`
				: packet.d.emoji.name;
			const reaction = message.reactions.cache.get(emoji);
			if (reaction) {
				reaction.users.cache.set(
					packet.d.user_id,
					client.users.cache.get(packet.d.user_id),
				);
			}
			if (packet.t === 'MESSAGE_REACTION_ADD') {
				client.emit(
					'messageReactionAdd',
					reaction,
					client.users.cache.get(packet.d.user_id),
				);
			}
			if (packet.t === 'MESSAGE_REACTION_REMOVE') {
				client.emit(
					'messageReactionRemove',
					reaction,
					client.users.cache.get(packet.d.user_id),
				);
			}
		});
	},
};