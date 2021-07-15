const { SlashCommand, CommandOptionType } = require('slash-create');

module.exports = class Bounty extends SlashCommand {
	constructor(creator, client) {
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
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
		});
	}

	async run(ctx) {
		if (ctx.user.bot) return;

		switch (ctx.options.operation) {
		case 'list':
			return ctx.send('there are zero bounties...');
		case 'create':
			break;
		case 'claim':
			break;
		default:
			return ctx.send('no bounty for you! go away');

		}
	}
};