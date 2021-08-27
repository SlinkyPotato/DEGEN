import {
	CommandContext,
	CommandOptionType, MessageOptions,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import HowToBounty from '../../service/help/HowToBounty';
import HowToPOAP from '../../service/help/HowToPOAP';

export default class Help extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'help',
			description: 'Get help on creating bounties, adding guests, and other operations',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					name: 'bounty',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Information on how to create, claim, complete, and delete bounties',
				},
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
		});
	}
	
	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`/help start ${ctx.user.username}#${ctx.user.discriminator}`);
		
		let messageOptions: MessageOptions;
		switch (ctx.subcommands[0]) {
		case 'bounty':
			console.log('/help bounty');
			messageOptions = HowToBounty();
			break;
		case 'poap':
			console.log('/help poap');
			messageOptions = HowToPOAP();
			break;
		}

		console.log(`/bounty end ${ctx.user.username}#${ctx.user.discriminator}`);
		return ctx.send(messageOptions);
	}
};