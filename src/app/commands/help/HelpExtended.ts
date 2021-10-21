import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HowToBounty from '../../service/help/HowToBounty';
import { LogUtils } from '../../utils/Log';
import discordServerIds from '../../service/constants/discordServerIds';

export default class HelpExtended extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'help-ext',
			description: 'Additional information on creating bounties, adding guests, and other operations.',
			options: [
				{
					name: 'bounty',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Information on how to create, claim, complete, and delete bounties',
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;

		let messageOptions: MessageOptions;
		switch (ctx.subcommands[0]) {
		case 'bounty':
			messageOptions = HowToBounty();
			break;
		}
		return ctx.send(messageOptions);
	}
}