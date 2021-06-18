const path = require('path');
const db = require('./db.js');
const { MessageEmbed } = require('discord.js');
const { CommandoClient } = require('discord.js-commando');

const client = new CommandoClient({
	commandPrefix: '$',
	owner: process.env.DISCORD_OWNER_ID,
});

client.registry
	.registerDefaultTypes()
	.registerGroups([
		['admin', 'Commands for admin automation'],
		['notion', 'Commands for interacting with the Notion API'],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
	.registerCommandsIn(path.join(__dirname, 'commands'));

// Open database connection
// db.connect(process.env.MONGODB_URI, (err) => {
// if (err) {
//   console.error('ERROR:', err);
// } else {
//   console.log("We are connected!");
// }

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('Going Bankless, Doing the DAO');
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

// filter raw packet data for reactions
client.on('raw', (packet) => {
	if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) {return;}
	const channel = client.channels.cache.get(packet.d.channel_id); // Grab the channel to check the message from
	if (channel.messages.cache.has(packet.d.message_id)) return; // don't emit if the message is cached
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

client.on('messageReactionAdd', (reaction, user) => {
	console.log('a reaction has been added');
	// client.registry.commands.get('starboard').run(reaction, user);
});

client.on('messageReactionRemove', (reaction, user) => {
	console.log('a reaction has been removed');
});

client.login(process.env.DISCORD_BOT_TOKEN);

// });
