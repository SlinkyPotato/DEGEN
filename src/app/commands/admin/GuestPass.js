const { SlashCommand, CommandOptionType } = require('slash-create');
const db = require('../../db/db.js');
const constants = require('../../constants.js');
const GuestPassService = require('../../service/GuestPassService.js');
const expiresInHours = 168;

module.exports = class GuestPass extends SlashCommand {
	constructor(creator, client) {
		super(creator, {
			name: 'guest-pass',
			description: 'Grant a temporary guest pass to a user',
            guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.USER,
                    name: 'user',
                    description: "User to grant guest pass to",
                    required: true
				}
			],
			throttling: {
				usages: 2,
				duration: 1
			}
		});

		this.client = client;
		this.filePath = __filename;
	}

	hasPermission(ctx) {
		return this.client.guilds.cache
			.get(ctx.guildID).members.cache
			.get(ctx.user.id).roles.cache
			.some(role => role.id === process.env.DISCORD_ROLE_LEVEL_2);
	}

	async run(ctx) {
		// Ignores commands from bots
		if (ctx.user.bot) return;

		const guild = this.client.guilds.cache.get(ctx.guildID)
		// Guild member to assign guest pass role
		const guildMember = guild.members.cache.get(ctx.options.user)

		if (guildMember.user.bot) {
			ctx.send('Bots don\'t need a guest pass!')
			return
		}

		// Retrieve Guest Pass Role
		const guestRole = GuestPassService.retrieveGuestRole(guild.roles);

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
				_id: guildMember.id,
				startTimestamp: currentTimestamp,
				expiresTimestamp: currentTimestamp + (expiresInHours * 1000 * 60 * 60),
			};

			// Find and update guest user in mongodb
			const dbUpdateResult = await dbGuestUsers.findOneAndReplace({
				_id: guildMember.id,
			}, guestDbUser, queryOptions);
			if (dbUpdateResult == null) {
				console.error('Failed to insert into DB');
				return;
			}
			console.log(`user ${guildMember.id} inserted into guestUsers`);

			// Add role to member
			guildMember.roles.add(guestRole).catch(console.error);
			console.log(`user ${guildMember.id} given ${constants.DISCORD_ROLE_GUEST_PASS} role`);
			ctx.send(`Hey <@${guildMember.id}>! You now have access for ${expiresInHours / 24} days.`)
		});

		// Send out notification on timer
		this.client.setTimeout(() => {
			guildMember.send(`Hey <@${guildMember.id}>, your guest pass is set to expire in 1 day. Let us know if you have any questions!`);
		}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 60 * 24));

		this.client.setTimeout(() => {
			guildMember.send(`Hey <@${guildMember.id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!`);
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
					_id: guildMember.id,
				};
				const dbDeleteResult = await dbGuestUsers.findOneAndDelete(guestDBQuery);
				if (dbDeleteResult == null) {
					console.error('Failed to remove from DB');
					return;
				}
				console.log(`guest pass removed for ${guildMember.id} in db`);

				// Remove guest pass role
				guildMember.roles.remove(guestRole).catch(console.error);

				console.log(`guest pass removed for ${guildMember.id} in discord`);

				return guildMember.send(`Hi <@${guildMember.id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!`);
			});
		}, expiresInHours * 1000 * 60 * 60);
	}
};
