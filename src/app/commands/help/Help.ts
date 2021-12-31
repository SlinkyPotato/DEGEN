import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HowToPOAP from '../../service/help/HowToPOAP';
import { LogUtils } from '../../utils/Log';
import { command } from '../../utils/SentryUtils';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'help',
			description: 'Additional information on the POAP distribution commands.',
			options: [
				{
					name: 'poap',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Information on how to start, stop, and optionally send out POAP links',
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
		default:
			messageOptions = { content: 'Invalid command selected' };
			break;
		}
		await ctx.send(messageOptions);
	}
}