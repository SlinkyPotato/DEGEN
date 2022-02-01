import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HowToPOAP from '../../service/help/HowToPOAP';
import Log, { LogUtils } from '../../utils/Log';
import { command } from '../../utils/SentryUtils';
import HowToAccount from '../../service/help/HowToAccount';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'help',
			description: 'Additional information on the POAP distribution commands.',
			options: [
				{
					name: 'poap',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Information on how to claim, start, stop, and send out POAP links.',
				},
			],
			throttling: {
				usages: 3,
				duration: 1,
			},
			defaultPermission: true,
		});
	}
	
	@command
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		let messageOptions: MessageOptions;
		switch (ctx.subcommands[0]) {
		case 'poap':
			messageOptions = HowToPOAP();
			break;
		case 'account':
			messageOptions = HowToAccount();
			break;
		default:
			messageOptions = { content: 'Invalid command selected' };
			break;
		}
		await ctx.send(messageOptions).catch(Log.error);
	}
}
