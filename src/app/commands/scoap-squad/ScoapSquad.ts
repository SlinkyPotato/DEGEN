import {
	ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import roleIds from '../../service/constants/roleIds';
import ServiceUtils from '../../utils/ServiceUtils';
import CreateNewScoapPoll from '../../service/scoap-squad/CreateNewScoapPoll';
import ValidationError from '../../errors/ValidationError';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';

module.exports = class ScoapSquad extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'scoap-squad',
			description: 'Create or delete a SCOAP Squad request',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
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
			defaultPermission: false,
			permissions: {
				[discordServerIds.banklessDAO]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level1,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level3,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level4,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.admin,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.genesisSquad,
						permission: true,
					},
				],
				[discordServerIds.discordBotGarage]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level1,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level3,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level4,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.admin,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.genesisSquad,
						permission: true,
					},
				],
			},
		});
	}

	async run(ctx: CommandContext) {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		let command: Promise<any>;
		switch (ctx.subcommands[0]) {
		case 'assemble':
			command = CreateNewScoapPoll(guildMember, ctx);
			break;
		default:
			return ctx.send(`${ctx.user.mention} Please try again.`);
		}

		this.handleCommandError(ctx, command);
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.catch(e => {
			if (!(e instanceof ValidationError)) {
				LogUtils.logError('failed to handle scoap-squad command', e);
				return ctx.send('Sorry something is not working and our devs are looking into it');
			}
		});
	}
	
};