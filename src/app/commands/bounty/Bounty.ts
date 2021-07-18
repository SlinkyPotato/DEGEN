import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import create from '../../service/bounty/create';

module.exports = class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, and claim bounties',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'operation',
					description: 'Easily view, create, and claim bounties from the bounty board',
					required: true,
					choices: [{
						name: 'list',
						value: 'list',
					}, {
						name: 'create',
						value: 'create',
					}, {
						name: 'claim',
						value: 'claim',
					}],
				},
				{
					type: CommandOptionType.STRING,
					name: 'create-summary',
					description: 'What would you like to be worked on?',
				},
				{
					type: CommandOptionType.STRING,
					name: 'create-reward',
					description: 'What is the reward? (i.e 100 BANK)',
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

		switch (ctx.options.operation) {
		case 'list':
			return ctx.send('there are zero bounties...');
		case 'create':
			return create(ctx);
		case 'claim':
			return ctx.send('bounty claimed for id: ');
		default:
			return ctx.send('no bounty for you! go away');
		}
	}
};