// Libs
const { CommandoClient } = require('discord.js-commando');
const guildMemberAdd = require('./events/GuildMemberAdd');
const guildMemberUpdate = require('./events/GuildMemberUpdate');
const rawPacketData = require('./events/Raw');

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
	guildMemberAdd(member);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
	guildMemberUpdate(oldMember, newMember);
});

client.on('message', (message) => {
	if(message.author.bot) return;
	const greetings = ['Hello','Howdy','Hey','Go Bankless,','Nice to meet you,','It\'s great to see you,','Ahoy,']
	if (message.content.toLowerCase().match('^.*degen$')) {
		message.channel.send(`${greetings[Math.floor(Math.random() * greetings.length)]} ${message.author.username}!`);
	}
});

// filter raw packet data for reactions
client.on('raw', (packet) => {
	rawPacketData(client, packet);
});

client.login(process.env.DISCORD_BOT_TOKEN);
