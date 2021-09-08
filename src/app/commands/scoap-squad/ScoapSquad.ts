import {
	// ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
// import roleIDs from '../../service/constants/roleIDs';
import ServiceUtils from '../../utils/ServiceUtils';
import CreateNewScoapPoll from '../../service/scoap-squad/CreateNewScoapPoll';
import ValidationError from '../../errors/ValidationError';

module.exports = class ScoapSquad extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'scoap-squad',
			description: 'Create or delete a SCOAP Squad request',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					name: 'assemble',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Create a SCOAP Squad request',
					options: [],
				},
				
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
			// defaultPermission: false,
			// permissions: {
			// 	[process.env.DISCORD_SERVER_ID]: [
			// 		{
			// 			type: ApplicationCommandPermissionType.ROLE,
			// 			id: roleIDs.level2,
			// 			permission: true,
			// 		},
			// 		{
			// 			type: ApplicationCommandPermissionType.ROLE,
			// 			id: roleIDs.admin,
			// 			permission: true,
			// 		},
			// 	],
			// },
		});
		this.filePath = __filename;
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`/scoap-squad start ${ctx.user.username}#${ctx.user.discriminator}`);
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

		// console.log(guildMember);

		let command: Promise<any>;
		switch (ctx.subcommands[0]) {
		case 'assemble':
			// if (ctx.subcommands[1] === 'new') {
			// const params = this.buildScoapCreateNewParams(ctx.options.assemble);
			console.log('/scoap-squad assemble new ');
			command = CreateNewScoapPoll(guildMember, ctx);
			// } else {
			// 	return ctx.send(`<@${ctx.user.id}> Sorry command not found, please try again`);
			// }
			break;
		default:
			return ctx.send(`${ctx.user.mention} Please try again.`);
		}

		this.handleCommandError(ctx, command);
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then(() => {
			console.log(`/scoap-squad end ${ctx.user.username}#${ctx.user.discriminator}`);
			// return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			return 0;
		}).catch(e => {
			if (!(e instanceof ValidationError)) {
				console.error('ERROR', e);
				return ctx.send('Sorry something is not working and our devs are looking into it');
			}
		});
	}
	
};