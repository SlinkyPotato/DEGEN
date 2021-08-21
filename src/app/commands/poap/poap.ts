import {
	ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import roleIDs from '../../service/constants/roleIds';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					name: 'occasion',
					type: CommandOptionType.STRING,
					description: 'The occasion for the discussion, most likely a guild or community call',
					choices: [
						{
							name: 'Community Call',
							value: 'COMMUNITY_CALL',
						},
					],
				},
			],
			throttling: {
				usages: 1,
				duration: 1,
			},
			defaultPermission: false,
			permissions: {
				[process.env.DISCORD_SERVER_ID]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.admin,
						permission: true,
					},
				],
			},
		});
	}
	
	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`start /poap ${ctx.user.username}#${ctx.user.discriminator}`);
		
		
	}
};