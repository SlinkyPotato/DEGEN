import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HowToPOAP from '../../service/help/HowToPOAP';
import { LogUtils } from '../../utils/Log';

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
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
		});
	}
	
	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		let messageOptions: MessageOptions;
		switch (ctx.subcommands[0]) {
		case 'poap':
			messageOptions = HowToPOAP();
			break;
		}
		return ctx.send(messageOptions);
	}
}