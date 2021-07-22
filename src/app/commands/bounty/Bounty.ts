import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import create from '../../service/bounty/create/new';
import list from '../../service/bounty/list';
import claim from '../../service/bounty/claim';
import validate from '../../service/bounty/create/validate';

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
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Create a bounty for the bounty board',
					options: [
						{
							name: 'new',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Create a new draft of a bounty and finalize on the website',
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
							name: 'validate',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Validate discord handle drafted bounty from the website',
							options: [
								{
									name: 'bounty-id',
									type: CommandOptionType.STRING,
									description: 'Bounty hash ID',
									required: true,
								},
							],
						},
					],
				},
				{
					name: 'list',
					type: CommandOptionType.SUB_COMMAND,
					description: 'View list of bounties you created or are claimed',
					options: [
						{
							name: 'list-type',
							type: CommandOptionType.STRING,
							description: 'Which bounties should be displayed?',
							choices: [
								{
									name: 'created by me',
									value: 'CREATED_BY_ME',
								},
								{
									name: 'claimed by me',
									value: 'CLAIMED_BY_ME',
								},
								{
									name: 'open',
									value: 'OPEN',
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
			if (ctx.subcommands[1] === 'new') {
				return create(ctx);
			} else if (ctx.subcommands[1] === 'validate') {
				return validate(ctx);
			}
			return ctx.send('Sorry command not found, please try again');
		case 'claim':
			return claim(ctx);
		default:
			return ctx.send('no bounty for you! go away');
		}
	}
};