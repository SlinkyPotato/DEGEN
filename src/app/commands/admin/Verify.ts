import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';

export default class Verify extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'verify',
			description: 'Verify ownership of external accounts and wallets',
			throttling: {
				usages: 1,
				duration: 2,
			},
			defaultPermission: true,
			options: [
				{
					name: 'account',
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
		
		Log.info(ctx.user.avatarURL);
	}
}