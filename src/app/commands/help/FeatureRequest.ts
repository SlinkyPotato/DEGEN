import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import { command } from '../../utils/SentryUtils';
import constants from '../../service/constants/constants';

export default class FeatureRequest extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'feature-request',
			description: 'Pull up the form to submit a new feature request.',
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
		
		await ctx.send(`Easily submit requests at #request-features on our support discord: ${constants.FEATURE_REQUEST_CHANNEL_INVITE}`).catch(Log.error);
	}
}
