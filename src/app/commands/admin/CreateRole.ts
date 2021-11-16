import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { LogUtils } from '../../utils/Log';
import ServiceUtils from '../../utils/ServiceUtils';
import discordServerIds from '../../service/constants/discordServerIds';
import CreateAFKRole from '../../service/admin/CreateAFKRole';

export default class CreateRole extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'create-role',
			description: 'Create a role on your discord server',
			throttling: {
				usages: 1,
				duration: 2,
			},
			guildIDs: [process.env.DISCORD_SERVER_ID, discordServerIds.discordBotGarage],
			defaultPermission: true,
			options: [
				{
					name: 'afk',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Create the AFK role on your server.',
				},
			],
		});
	}
	
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		const { guild, guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		try {
			switch (ctx.subcommands[0]) {
			case 'afk':
				if (ServiceUtils.getRoleId(guildMember.guild.roles, 'AFK')) {
					return await ctx.send('AFK role already exists');
				}
				if(await CreateAFKRole(guild)) {
					await ctx.send('AFK role created!');
				} else {
					await ctx.send('Sorry, something went wrong.');
				}
				break;
			}
		} catch (e) {
			LogUtils.logError('Failed to create new role', e, guildMember.guild.id);
			await ctx.send('Welp, something is definitely broken. I would blame you, but I know better. I\'ll let my devs ' +
				'know something is wrong.');
		}
	}
}