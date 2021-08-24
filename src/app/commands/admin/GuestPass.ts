import { SlashCommand, CommandOptionType, ApplicationCommandPermissionType, CommandContext } from 'slash-create';
import client from '../../app';
import roleIds from '../../service/constants/roleIds';
import { addGuestRoleToUser } from '../../service/guest-pass/AddGuestPass';

export default class GuestPass extends SlashCommand {
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
						id: roleIds.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.admin,
						permission: true,
					},
				],
			},
		});
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		
		console.log('/guest-pass start');
		const guild = await client.guilds.fetch(ctx.guildID);
		const guestUser = await guild.members.fetch(ctx.options.user);

		if (guestUser.user.bot) {
			return ctx.send('Bots don\'t need a guest pass!');
		}
		
		await addGuestRoleToUser(guestUser);

		return ctx.send(`<@${ctx.user.id}> guest pass added and message sent!`);
	}
};

