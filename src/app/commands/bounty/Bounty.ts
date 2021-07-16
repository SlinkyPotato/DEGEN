import { CommandContext, SlashCreator } from 'slash-create';

const { SlashCommand, CommandOptionType } = require('slash-create');

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
					description: '(list|create|claim)',
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
			return ctx.send('bounty created with id: ');
		case 'claim':
			return ctx.send('bounty claimed for id: ');
		default:
			return ctx.send('no bounty for you! go away');
		}
	}
};