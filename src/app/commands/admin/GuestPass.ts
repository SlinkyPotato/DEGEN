import { SlashCommand, CommandOptionType, ApplicationCommandPermissionType, CommandContext } from 'slash-create';
import constants from '../../constants';
import { retrieveGuestRole } from '../../service/GuestPassService';
import client from '../../app';
import { Db } from 'mongodb';
import dbInstance from '../../utils/db';
import roleIDs from '../../constants/roleIDs';

const expiresInHours = 168;

module.exports = class GuestPass extends SlashCommand {
	constructor(creator) {
		super(creator, {
			name: 'guest-pass',
			description: 'Grant a temporary guest pass to a user',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.USER,
					name: 'user',
					description: 'User to grant guest pass to',
					required: true,
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: false,
			permissions: {
				[process.env.DISCORD_SERVER_ID]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.admin,
						permission: true,
					},
				],
			},
		});
		this.filePath = __filename;
	}

	run(ctx: CommandContext) {
		// Ignores commands from bots
		if (ctx.user.bot) return;
		console.log('/guest-pass start');
		return module.exports.grantGuestPass(ctx);
	}
};

module.exports.grantGuestPass = async (ctx: CommandContext) => {
	const guild = await client.guilds.fetch(ctx.guildID);
	const guildMember = await guild.members.fetch(ctx.options.user);

	if (guildMember.user.bot) {
		return ctx.send('Bots don\'t need a guest pass!');
	}

	// Retrieve Guest Pass Role
	const guestRole = retrieveGuestRole(guild.roles);

	// DB Connected
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const dbGuestUsers = db.collection(constants.DB_COLLECTION_GUEST_USERS);
	const queryOptions = {
		upsert: true,
	};
	const currentTimestamp = Date.now();
	const guestDbUser = {
		_id: guildMember.id,
		tag: guildMember.user.tag,
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

	await dbInstance.close();
	console.log(`/guest-pass end user ${guildMember.user.tag} inserted into guestUsers`);

	// Add role to member
	guildMember.roles.add(guestRole).catch(console.error);
	console.log(`user ${guildMember.id} given ${constants.DISCORD_ROLE_GUEST_PASS} role`);
	

	// Send out notification on timer
	client.setTimeout(() => {
		guildMember.send(`Hey <@${guildMember.id}>, your guest pass is set to expire in 1 day. Let us know if you have any questions!`);
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 60 * 24));

	client.setTimeout(() => {
		guildMember.send(`Hey <@${guildMember.id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!`);
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 15));

	// Handle removal of guest pass
	client.setTimeout(async () => {
		const timeoutDB: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
		const timeoutDBGuestUsers = timeoutDB.collection(constants.DB_COLLECTION_GUEST_USERS);
		const guestDBQuery = {
			_id: guildMember.id,
		};
		const dbDeleteResult = await timeoutDBGuestUsers.findOneAndDelete(guestDBQuery);
		if (dbDeleteResult == null) {
			console.error('Failed to remove from DB');
			return;
		}
		await dbInstance.close();
		console.log(`guest pass removed for ${guildMember.id} in db`);

		// Remove guest pass role
		guildMember.roles.remove(guestRole).catch(console.error);

		console.log(`/guest-pass end guest pass removed for ${guildMember.user.tag} in discord`);

		return guildMember.send(`Hi <@${guildMember.id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!`);
	}, expiresInHours * 1000 * 60 * 60);

	return ctx.send(`Hey <@${guildMember.id}>! You now have access for ${expiresInHours / 24} days.`);
};
