const { Command } = require('discord.js-commando');
const db = require('../../db.js');
const constants = require('../../constants.js');
const GuestPassService = require('../../service/GuestPassService.js');

const expiresInHours = 0.5;

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

			// Retrieve Guest Pass Role
			const guestRole = GuestPassService.retrieveGuestRole(msg.guild.roles);

			// Open database connection
			db.connect(process.env.MONGODB_URI, async (err) => {
				if (err) {
					console.error('ERROR:', err);
					return;
				}
				// DB Connected
				const dbGuestUsers = db.get().collection(constants.DB_COLLECTION_GUEST_USERS);
				const queryOptions = {
					upsert: true,
				};
				const currentTimestamp = Date.now();
				const guestDbUser = {
					_id: guildMember.user.id,
					startTimestamp: currentTimestamp,
					expiresTimestamp: currentTimestamp + (expiresInHours * 1000 * 60 * 60),
				};

				// Find and update guest user in mongodb
				const dbUpdateResult = await dbGuestUsers.findOneAndReplace({
					_id: guildMember.user.id,
				}, guestDbUser, queryOptions);
				if (dbUpdateResult == null) {
					console.error('Failed to insert into DB');
					return;
				}
				console.log(`user ${guildMember.user.id} inserted into guestUsers`);

				// Add role to member
				guildMember.roles.add(guestRole).catch(console.error);
				console.log(`user ${guildMember.user.id} given ${constants.DISCORD_ROLE_GUEST_PASS} role`);
				return msg.say(`Hey <@${guildMember.user.id}>! You now has access for ${expiresInHours * 60} minutes.`);
			});

			// Send out notification on timer
			this.client.setTimeout(() => {
				guildMember.send(`Hey <@${guildMember.user.id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!`);
			}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 15));

			// Handle removal of guest pass
			this.client.setTimeout(() => {
				db.connect(process.env.MONGODB_URI, async (err) => {
					if (err) {
						console.error('ERROR:', err);
						return;
					}
					const dbGuestUsers = db.get().collection(constants.DB_COLLECTION_GUEST_USERS);
					const guestDBQuery = {
						_id: guildMember.user.id,
					};
					const dbDeleteResult = await dbGuestUsers.findOneAndDelete(guestDBQuery);
					if (dbDeleteResult == null) {
						console.error('Failed to remove from DB');
						return;
					}
					console.log(`guest pass removed for ${guildMember.user.id} in db`);

					// Remove guest pass role
					guildMember.roles.remove(guestRole).catch(console.error);

					console.log(`guest pass removed for ${guildMember.user.id} in discord`);

					return guildMember.send(`Hi <@${guildMember.user.id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!`);
				});
			}, expiresInHours * 1000 * 60 * 60);
		}
	}
};
