import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import { command } from '../../utils/SentryUtils';

export default class FeatureRequest extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'feature-request',
			description: 'Pull up the form to submit a new feature request',
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

		const form = 'https://discord.gg/yHTQkERpsD';
		await ctx.send(`Easily submit requests at #request-features on our support discord: ${form}`).catch(Log.error);
	}
}
