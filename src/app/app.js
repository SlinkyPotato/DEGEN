// Libs
const { MessageEmbed } = require('discord.js');
const { CommandoClient } = require('discord.js-commando');
const constants = require('./constants');

// Background services
const GuestPassService = require('./service/GuestPassService.js');

const path = require('path');

const client = new CommandoClient({
	commandPrefix: '$',
	owner: process.env.DISCORD_OWNER_ID,
});

client.registry
	.registerDefaultTypes()
	.registerGroups([
		['admin', 'Commands for admin automation'],
		['notion', 'Commands for interacting with the Notion API'],
		['roles', 'Command for managing user options'],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
	.registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('Going Bankless, Doing the DAO');
	GuestPassService(client);
});

// basic error monitoring
client.on('error', console.error);

// new member onboarding
client.on('guildMemberAdd', (member) => {
	const embed = new MessageEmbed()
		.setTitle('Welcome!')
		.setColor(0xff0000)
		.setDescription(
			'Have a look around and enjoy your time in the server!',
		);
	member.send(`Hi ${member}, welcome to the BanklessDAO!`);
	member.send(embed);
	member.guild.channels
		.find((c) => c.name === 'welcome')
		.send(`Welcome to the DAO, <@${member.user.id}>`);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
	// Check if member roles were updated
	if (oldMember.roles !== newMember.roles) {
		// Check if guest pass was added or removed
		const newMemberHasGuestPass = newMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
		const oldMemberHasGuestPass = oldMember.roles.cache.some(role => role.name === constants.DISCORD_ROLE_GUEST_PASS);
		if (newMemberHasGuestPass && !oldMemberHasGuestPass) {
			// Guest pass was added
			GuestPassService.updateNotionGuestPassDatabase(newMember.user.tag, true);
		}
		else if (oldMemberHasGuestPass && !newMemberHasGuestPass) {
			// Guest pass was removed
			GuestPassService.updateNotionGuestPassDatabase(newMember.user.tag, false);
		}
	}
});

// filter raw packet data for reactions
client.on('raw', (packet) => {
	if (
		!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)
	) {
		return;
	}
	// Grab the channel to check the message from
	const channel = client.channels.cache.get(packet.d.channel_id);
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
});

client.login(process.env.DISCORD_BOT_TOKEN);

