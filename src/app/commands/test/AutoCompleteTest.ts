import discordServerIds from '../../service/constants/discordServerIds';

const { SlashCommand, CommandOptionType } = require('slash-create');

module.exports = class HelloCommand extends SlashCommand {
	constructor(creator) {
		super(creator, {
			name: 'autocomplete',
			description: 'Says hello to you.',
			guildIDs: [discordServerIds.discordBotGarage],
			options: [{
				type: CommandOptionType.STRING,
				name: 'greeting',
				description: 'Enter a greeting!',
				required: true,
				autocomplete: true,
			}],
			defaultPermission: true,
		});
		
		// Not required initially, but required for reloading with a fresh file.
		this.filePath = __filename;
	}
	
	async autocomplete(ctx) {
		// You can send a list of choices with `ctx.sendResults` or by returning a list of choices.
		// Get the focused option name with `ctx.focused`.
		return [{ name: `Your text: ${ctx.options[ctx.focused]}`, value: ctx.options[ctx.focused] },
			{name: 'test', value: 'SOMETHING' }];
	}
	
	async run(ctx) {
		return `> ${ctx.options.greeting}\nHello!`;
	}
};