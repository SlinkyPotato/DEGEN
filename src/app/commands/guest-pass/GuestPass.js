const { Command } = require('discord.js-commando');
const db = require('../../db.js');

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
			// Open database connection
			db.connect(process.env.MONGODB_URI, async (err) => {
				if (err) {
					console.error('ERROR:', err);
					return;
				}
				// DB Connected
				const dbGuestUsers = db.get().collection('guestUsers');
				const queryOption = { upsert: true };
				const guestDbUser = {
					_id: guildMember.user.id,
					startTimestamp: Date.now(),
				};
				const dbUpdateResult = await dbGuestUsers.insertOne(guestDbUser, queryOption);
				if (dbUpdateResult.insertedCount !== 1) {
					console.error('Failed to insert into DB');
					return;
				}
				console.log(`user ${guildMember.user.id} inserted into guestUsers`);
				// Add guest pass role to user
				const guestRole = msg.guild.roles.cache.find((role) => {
					return role.name === GUEST_PASS_ROLE_NAME;
				});
				guildMember.roles.add(guestRole).catch(console.error);
				console.log(`user ${guildMember.user.id} given ${GUEST_PASS_ROLE_NAME} role`);
				return msg.say(`Hey <@${guildMember.user.id}>! You now has access for 24 hours.`);
			});
		}
	}
};
