const { Command } = require('discord.js-commando');

const GUEST_PASS_ROLE_NAME = 'Guest Pass';

module.exports = class GuestPassCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'guest-pass',
			group: 'roles',
			memberName: 'guest-pass',
			description: 'Give guest pass access to user for x amount of time',
			guildOnly: true,
			args: [
				{
					key: 'guildMember',
					prompt: 'Who would you like to give guest access?',
					type: 'member',
				},
			],
		});
	}

	async run(msg, { guildMember }) {
		if (!guildMember.user.bot) {
			const guestRole = msg.guild.roles.cache.find((role) => {
				return role.name === GUEST_PASS_ROLE_NAME;
			});
			guildMember.roles.add(guestRole).catch(console.error);
		}

		// Open database connection
		/*
    db.connect(process.env.MONGODB_URI, (err) => {
    if (err) {
      console.error('ERROR:', err);
    } else {
      console.log("We are connected!");
    }
    */
		return msg.say('Hello ' + guildMember.user.username);
	}
};
