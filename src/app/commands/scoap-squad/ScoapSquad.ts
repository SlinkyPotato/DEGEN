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
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Create a SCOAP Squad request',
					options: [
						{
							name: 'new',
							type: CommandOptionType.SUB_COMMAND,
							description: 'Initialize a new SCOAP Squad request',
							options: [
								{
									name: 'title',
									type: CommandOptionType.STRING,
									description: 'What is the title of your project?',
									required: true,
								},
								{
									name: 'summary',
									type: CommandOptionType.STRING,
									description: 'Describe the project in more detail',
									required: true,
								},

								{
									name: 'reward',
									type: CommandOptionType.STRING,
									description: 'If this project becomes a bounty, what will be the reward? (i.e 100 BANK)',
									required: false,
								},


							],
						},

					],
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
		// this.filePath = __filename;
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`/scoap-squad start ${ctx.user.username}#${ctx.user.discriminator}`);
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);

		console.log(guildMember);

		let command: Promise<any>;
		switch (ctx.subcommands[0]) {
		case 'assemble':
			if (ctx.subcommands[1] === 'new') {
				const params = this.buildScoapCreateNewParams(ctx.options.assemble);
				console.log('/scoap-squad assemble new ' + params);
				command = CreateNewScoapPoll(guildMember, params, ctx);
			} else {
				return ctx.send(`<@${ctx.user.id}> Sorry command not found, please try again`);
			}
			break;
		default:
			return ctx.send(`${ctx.user.mention} Please try again.`);
		}

		this.handleCommandError(ctx, command);
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then(() => {
			console.log(`/scoap-squad end ${ctx.user.username}#${ctx.user.discriminator}`);
			return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			if (!(e instanceof ValidationError)) {
				console.error('ERROR', e);
				return ctx.send('Sorry something is not working and our devs are looking into it');
			}
		});
	}
	
	buildScoapCreateNewParams(ctxOptions): any {
		console.log(ctxOptions);
		const [reward, symbol] = (ctxOptions.new.reward != null) ? ctxOptions.new.reward.split(' ') : [null, null];
		return {
			title: ctxOptions.new.title,
			summary: ctxOptions.new.summary,
			reward: {
				amount: reward,
				currencySymbol: symbol,
			},
			// roles: {
			// 	role1: ctxOptions.define-roles.roles,
			// 	role2: ctxOptions.roles,
			// 	role3: ctxOptions.roles,
			// 	role4: ctxOptions.roles,
			// 	role5: ctxOptions.roles,
			// 	role6: ctxOptions.roles,
			// },

		};
	}
};