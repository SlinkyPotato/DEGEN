import {
	CommandContext,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import { command } from '../../utils/SentryUtils';
import ServiceUtils from '../../utils/ServiceUtils';
import SetupDEGEN from '../../service/setup/SetupDEGEN';
import ValidationError from '../../errors/ValidationError';

export default class Setup extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'setup',
			description: 'Configure and setup DEGEN for this discord server.',
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
		});
	}
	
	@command
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		// Ignore commands from bots
		if (ctx.user.bot) return;
		
		try {
			if (ctx.guildID == null) {
				await ctx.send({ content: 'Please setup DEGEN from a discord server.' });
				return;
			}
			
			const { guild, guildMember } = await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id);
			
			if (!(ServiceUtils.isDiscordAdmin(guildMember) || ServiceUtils.isDiscordServerManager(guildMember))) {
				await ctx.send({ content: 'Sorry, only discord admins and managers can configure poap settings.', ephemeral: true });
				return;
			}
			
			await SetupDEGEN(guild);
			
			await ctx.send({ content: '#degen-setup created', ephemeral: true }).catch(Log.error);
		} catch (e) {
			if (e instanceof ValidationError) {
				await ServiceUtils.sendOutErrorMessage(ctx, `${e?.message}`);
				return;
			}
			Log.error(e);
			await ServiceUtils.sendOutErrorMessage(ctx);
		}
	}
}
