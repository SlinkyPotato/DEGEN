import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
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
							description: 'Type of account or wallet to unlink from discord.',
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
				{
					name: 'unlink',
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
				{
					name: 'status',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Check linked accounts',
					options: [],
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
		
		const subCommand: string = ctx.subcommands[0];
		
		try {
			const { guildMember } = await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id);
			
			switch (subCommand) {
			case 'verify':
				await VerifyTwitter(ctx, guildMember, true).catch(e => { throw e; });
				break;
			case 'unlink':
				break;
			case 'status':
				break;
			default:
				await ctx.send({ content: 'Please try again' }).catch(Log.error);
				break;
			}
			
		} catch (e) {
			if (e instanceof ValidationError) {
				await ctx.send({ content: `${e.message}`, ephemeral: true });
			} else {
				LogUtils.logError('failed to verify user', e);
				await ServiceUtils.sendOutErrorMessage(ctx);
			}
		}
	}
}