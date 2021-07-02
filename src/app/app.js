// Libs
const { CommandoClient } = require('discord.js-commando');

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
		['bounty board', 'Commands for Bounty Board Workflow Management'],
		['governance', 'Commands for governance integrations'],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
	.registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('Going Bankless, Doing the DAO');
	GuestPassService(client);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// basic error monitoring
client.on('error', console.error);

// new member onboarding
client.on('guildMemberAdd', (member) => {
	require("./events/GuildMemberAdd")(member)
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
	require("./events/GuildMemberUpdate")(oldMember, newMember)
});

// filter raw packet data for reactions
client.on('raw', (packet) => {
	require("./events/Raw")(client, packet)
});


