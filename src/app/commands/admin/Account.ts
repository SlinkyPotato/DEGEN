import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { LogUtils } from '../../utils/Log';
import VerifyTwitter from '../../service/account/VerifyTwitter';
import ServiceUtils from '../../utils/ServiceUtils';

export default class Account extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'account',
			description: 'Manage your accounts integration.',
			throttling: {
				usages: 1,
				duration: 2,
			},
			defaultPermission: true,
			options: [
				{
					name: 'verify',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Link DEGEN to your account or wallet.',
					options: [
						{
							name: 'type',
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
			await VerifyTwitter(guildMember);
			await ctx.send({ content: 'Twitter verification sent to your DM!' });
		} catch (e) {
			LogUtils.logError('failed to verify user', e, guildMember.guild.id);
			await ctx.send('Something is not working...');
		}
	}
}