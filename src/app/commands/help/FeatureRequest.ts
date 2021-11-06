import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import { LogUtils } from '../../utils/Log';

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

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		// Ignores commands from bots
		if (ctx.user.bot) return;

		const form = 'https://degen.canny.io/';
		await ctx.send(`Here you are ${ctx.user.mention}, the DEGEN feature request form: ${form}`);
	}
}