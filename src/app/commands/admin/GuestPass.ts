import {
	SlashCommand,
	CommandOptionType,
	ApplicationCommandPermissionType,
	CommandContext,
	SlashCreator,
} from 'slash-create';
import client from '../../app';
import roleIds from '../../service/constants/roleIds';
import { addGuestRoleToUser } from '../../service/guest-pass/AddGuestPass';
import discordServerIds from '../../service/constants/discordServerIds';
import Log, { LogUtils } from '../../utils/Log';

export default class GuestPass extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'guest-pass',
			description: 'Grant a temporary guest pass to a user',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
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
				[discordServerIds.banklessDAO]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level3,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level4,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.genesisSquad,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.admin,
						permission: true,
					},
				],
				[discordServerIds.discordBotGarage]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level3,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level4,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.genesisSquad,
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

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		Log.info('/guest-pass start');
		const guild = await client.guilds.fetch(ctx.guildID);
		const guestUser = await guild.members.fetch(ctx.options.user);

		if (guestUser.user.bot) {
			return ctx.send('Bots don\'t need a guest pass!');
		}

		try {
			await addGuestRoleToUser(guestUser);
		} catch (e) {
			LogUtils.logError('failed to add guest role to user', e);
		}
		await ctx.send(`<@${ctx.user.id}> guest pass added and message sent!`);
	}
}

