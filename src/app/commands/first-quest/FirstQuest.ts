import {
	ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import roleIds from '../../service/constants/roleIds';
import ServiceUtils from '../../utils/ServiceUtils';
import ConfigureFirstQuest from '../../service/first-quest/ConfigureFirstQuest';
import ValidationError from '../../errors/ValidationError';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';
import FirstQuestPOAP from '../../service/first-quest/FirstQuestPOAP';

module.exports = class FirstQuest extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'first-quest',
			description: 'First Quest Admin Commands',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
			options: [
				{
					name: 'config',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Configure First Quest Message Content',
					options: [],
				},
				{
					name: 'poap-refill',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Update the POAP claim links',
					options: [
						{
							name: 'refill-type',
							type: CommandOptionType.STRING,
							description: 'Add (POAP is same as current) or replace (It\'s a new POAP) POAPs ',
							required: true,
							choices: [
								{
									name: 'add',
									value: 'ADD',
								},
								{
									name: 'replace',
									value: 'REPLACE',
								},
							],
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
				[discordServerIds.banklessDAO]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIds.level2,
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
						id: roleIds.level2,
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
		case 'config':
			command = ConfigureFirstQuest(guildMember, ctx);
			break;
		case 'poap-refill':
			command = FirstQuestPOAP(guildMember, ctx);
			break;
		default:
			return ctx.send(`${ctx.user.mention} Please try again.`);
		}

		this.handleCommandError(ctx, command);
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.catch(e => {
			if (!(e instanceof ValidationError)) {
				LogUtils.logError('failed to handle first-quest command', e);
				return ctx.send('Sorry something is not working and our devs are looking into it');
			}
		});
	}

};