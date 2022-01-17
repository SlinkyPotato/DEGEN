import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import VerifyTwitter from '../../service/account/VerifyTwitter';
import ServiceUtils from '../../utils/ServiceUtils';
import ValidationError from '../../errors/ValidationError';
import { command } from '../../utils/SentryUtils';
import UnlinkAccount from '../../service/account/UnlinkAccount';
import constants from '../../service/constants/constants';
import ListAccounts from '../../service/account/ListAccounts';

export default class Account extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'account',
			description: 'Manage your account\'s integration.',
			throttling: {
				usages: 1,
				duration: 2,
			},
			defaultPermission: true,
			options: [
				{
					name: 'link',
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
									value: constants.PLATFORM_TYPE_TWITTER,
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
									value: constants.PLATFORM_TYPE_TWITTER,
								},
							],
						},
					],
				},
				{
					name: 'list',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Display all linked accounts.',
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
			await ctx.send({ content: 'Please try command within a discord server.' });
			return;
		}
		
		const subCommand: string = ctx.subcommands[0];
		
		try {
			const { guildMember } = await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id);
			
			switch (subCommand) {
			case 'link':
				await VerifyTwitter(ctx, guildMember, true).catch(e => { throw e; });
				break;
			case 'unlink':
				await UnlinkAccount(ctx, guildMember, ctx.options.unlink.platform).catch(e => { throw e; });
				break;
			case 'list':
				await ListAccounts(ctx, guildMember).catch(e => { throw e; });
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