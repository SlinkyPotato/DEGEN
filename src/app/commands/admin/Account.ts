import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { LogUtils } from '../../utils/Log';
import VerifyTwitter from '../../service/account/VerifyTwitter';
import ServiceUtils from '../../utils/ServiceUtils';
import discordServerIds from '../../service/constants/discordServerIds';
import ValidationError from '../../errors/ValidationError';
import { command } from '../../utils/SentryUtils';

export default class Account extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'account',
			description: 'Manage your account\'s integration.',
			throttling: {
				usages: 1,
				duration: 2,
			},
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
			defaultPermission: true,
			options: [
				{
					name: 'verify',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Link DEGEN to your account or wallet.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'Type of account or wallet to verify and link.',
							required: true,
							choices: [
								{
									name: 'Twitter',
									value: 'TWITTER_ACCOUNT',
								},
							],
						},
					],
				},
			],
		});
	}
	
	@command
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		if (ctx.guildID == null) {
			await ctx.send({ content: 'Please try this command within a discord server.' });
			return;
		}
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id);
		try {
			await VerifyTwitter(ctx, guildMember).catch(e => { throw e; });
		} catch (e) {
			if (e instanceof ValidationError) {
				await ctx.send({ content: `${e.message}`, ephemeral: true });
			} else {
				LogUtils.logError('failed to verify user', e, guildMember.guild.id);
				await ServiceUtils.sendOutErrorMessage(ctx);
			}
		}
	}
}