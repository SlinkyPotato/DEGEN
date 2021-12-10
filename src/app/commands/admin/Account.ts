import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { LogUtils } from '../../utils/Log';
import VerifyTwitter from '../../service/account/VerifyTwitter';
import ServiceUtils from '../../utils/ServiceUtils';
import discordServerIds from '../../service/constants/discordServerIds';

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
	
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		try {
			await VerifyTwitter(ctx, guildMember).catch(e => { throw e; });
		} catch (e) {
			LogUtils.logError('failed to verify user', e, guildMember.guild.id);
			await ServiceUtils.sendOutErrorMessage(ctx);
		}
	}
}