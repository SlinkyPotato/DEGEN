import discordServerIds from '../../service/constants/discordServerIds';

const { SlashCommand, ApplicationCommandType } = require('slash-create');

module.exports = class AvatarCommand extends SlashCommand {
	constructor(creator) {
		super(creator, {
			// You must specify a type for context menu commands, but defaults
			// to `CHAT_INPUT`, or regular slash commands.
			type: ApplicationCommandType.USER,
			name: 'contextmenutest',
			guildIDs: [discordServerIds.discordBotGarage],
		});
		
		this.filePath = __filename;
	}
	
	async run(ctx) {
		// The target user can be accessed from here
		// You can also use `ctx.targetMember` for member properties
		const target = ctx.targetUser;
		return `${target.username}'s Avatar: ${target.avatarURL}`;
	}
};