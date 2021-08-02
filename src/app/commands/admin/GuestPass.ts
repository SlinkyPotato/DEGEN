import { SlashCommand, CommandOptionType, ApplicationCommandPermissionType, CommandContext } from 'slash-create';
import client from '../../app';
import roleIDs from '../../constants/roleIDs';
import AddGuestPass, { expiresInHours } from '../../service/guest-pass/AddGuestPass';

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

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		
		console.log('/guest-pass start');
		const guild = await client.guilds.fetch(ctx.guildID);
		const guestUser = await guild.members.fetch(ctx.options.user);

		if (guestUser.user.bot) {
			return ctx.send('Bots don\'t need a guest pass!');
		}
		
		await AddGuestPass(guestUser);

		return ctx.send(`Hey <@${guestUser.id}>! You now have access for ${expiresInHours / 24} days.`);

	}
};

