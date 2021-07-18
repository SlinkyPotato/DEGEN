import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import create from '../../service/bounty/create';
import list from '../../service/bounty/list';
import claim from '../../service/bounty/claim';

module.exports = class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, and claim bounties',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					name: 'claim',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Claim a bounty to work on',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
				{
					name: 'create',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Create a bounty for the bounty board',
					options: [
						{
							name: 'summary',
							type: CommandOptionType.STRING,
							description: 'What would you like to be worked on?',
							required: true,
						},
						{
							name: 'reward',
							type: CommandOptionType.STRING,
							description: 'What is the reward? (i.e 100 BANK)',
							required: true,
						},
					],
				},
				{
					name: 'list',
					type: CommandOptionType.SUB_COMMAND,
					description: 'View list of bounties you created or are claimed',
					options: [
						{
							name: 'bounty-type',
							type: CommandOptionType.STRING,
							description: 'Which bounties should be displayed?',
							choices: [
								{
									name: 'claimed by me',
									value: '1',
								},
								{
									name: 'created by me',
									value: '2',
								},
								{
									name: 'all',
									value: '3',
								},
							],
							required: true,
						},
					],
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
		switch (ctx.subcommands[0]) {
		case 'list':
			return list(ctx);
		case 'create':
			return create(ctx);
		case 'claim':
			return claim(ctx);
		default:
			return ctx.send('no bounty for you! go away');
		}
	}
};