import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/start/StartPOAP';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';
import EndPOAP from '../../service/poap/EndPOAP';
import DistributePOAP from '../../service/poap/DistributePOAP';
import SchedulePOAP from '../../service/poap/SchedulePOAP';
import { LogUtils } from '../../utils/Log';
import ClaimPOAP from '../../service/poap/ClaimPOAP';
import constants from '../../service/constants/constants';
import { GuildMember } from 'discord.js';
import ModifyPOAP from '../../service/poap/config/ModifyPOAP';
import StatusPOAP from '../../service/poap/config/StatusPOAP';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links',
			options: [
				{
					name: 'config',
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Configure users and roles to have access to POAP commands.',
					options: [
						{
							name: 'status',
							description: 'test',
							type: CommandOptionType.SUB_COMMAND,
							options: [],
						},
						{
							name: 'modify',
							description: 'Add or remove roles and users',
							type: CommandOptionType.SUB_COMMAND,
							options: [
								{
									name: 'role-1',
									type: CommandOptionType.ROLE,
									description: 'The role that should have access to poap commands.',
									required: false,
								},
								{
									name: 'role-2',
									type: CommandOptionType.ROLE,
									description: 'The role that should have access to poap commands.',
									required: false,
								},
								{
									name: 'role-3',
									type: CommandOptionType.ROLE,
									description: 'The role that should have access to poap commands.',
									required: false,
								},
								{
									name: 'user-1',
									type: CommandOptionType.USER,
									description: 'The user that should have access to poap commands.',
									required: false,
								},
								{
									name: 'user-2',
									type: CommandOptionType.USER,
									description: 'The user that should have access to poap commands.',
									required: false,
								},
								{
									name: 'user-3',
									type: CommandOptionType.USER,
									description: 'The user that should have access to poap commands.',
									required: false,
								},
							],
						},
					],
				},
				{
					name: 'schedule',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Schedule a POAP event, upload the PNG image to be minted, and get the links.txt file over email.',
					options: [
						{
							name: 'mint-copies',
							type: CommandOptionType.INTEGER,
							description: 'The number of POAPs to be minted for all of the participants. Best to overestimate.',
							required: true,
						},
					],
				},
				{
					name: 'start',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Begin POAP event and start tracking participants.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'The hosting location of the POAP event.',
							required: true,
							choices: [
								{
									name: 'Discord',
									value: constants.PLATFORM_TYPE_DISCORD,
								},
								{
									name: 'Twitter Spaces',
									value: constants.PLATFORM_TYPE_TWITTER,
								},
							],
						},
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The name of the event that participants will see in their DMs.',
							required: true,
						},
						{
							name: 'duration-minutes',
							type: CommandOptionType.STRING,
							description: 'Number of minutes the event will remain active.',
							required: false,
						},
					],
				},
				{
					name: 'end',
					type: CommandOptionType.SUB_COMMAND,
					description: 'End POAP event and receive a list of participants.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'The hosting location of the POAP event.',
							required: true,
							choices: [
								{
									name: 'Discord',
									value: constants.PLATFORM_TYPE_DISCORD,
								},
								{
									name: 'Twitter Spaces',
									value: constants.PLATFORM_TYPE_TWITTER,
								},
							],
						},
					],
				},
				{
					name: 'distribute',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Distribute links to participants.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'Platform where users can claim from where they attended the event.',
							required: true,
							choices: [
								{
									name: 'Discord',
									value: constants.PLATFORM_TYPE_DISCORD,
								},
								{
									name: 'Twitter Spaces',
									value: constants.PLATFORM_TYPE_TWITTER,
								},
							],
						},
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The name of the event that participants will see in their DMs.',
							required: true,
						},
					],
				},
				{
					name: 'claim',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Claim POAPs for all the events DEGEN failed to deliver.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'Platform where users can claim from where they attended the event.',
							required: true,
							choices: [
								{
									name: 'Discord',
									value: constants.PLATFORM_TYPE_DISCORD,
								},
								{
									name: 'Twitter Spaces',
									value: constants.PLATFORM_TYPE_TWITTER,
								},
							],
						},
					],
				},
			],
			throttling: {
				usages: 10,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext) {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		let guildMember: GuildMember;
		if (ctx.guildID != null) {
			guildMember = (await ServiceUtils.getGuildAndMember(ctx)).guildMember;
		}
		
		let command: Promise<any>;
		let authorizedRoles: any[];
		let authorizedUsers: any[];
		try {
			switch (ctx.subcommands[0]) {
			case 'config':
				if (ctx.subcommands[1] == 'status') {
					command = StatusPOAP(ctx, guildMember);
				} else if (ctx.subcommands[1] == 'modify') {
					authorizedRoles = [ctx.options.config.modify['role-1'], ctx.options.config.modify['role-2'], ctx.options.config.modify['role-3']];
					authorizedUsers = [ctx.options.config.modify['user-1'], ctx.options.config.modify['user-2'], ctx.options.config.modify['user-3']];
					command = ModifyPOAP(ctx, guildMember, authorizedRoles, authorizedUsers);
				}
				break;
			case 'schedule':
				command = SchedulePOAP(ctx, guildMember, ctx.options.schedule['mint-copies']);
				break;
			case 'start':
				command = StartPOAP(ctx, guildMember, ctx.options.start['platform'], ctx.options.start.event, ctx.options.start['duration-minutes']);
				break;
			case 'end':
				if (ctx.guildID == undefined) {
					await ctx.send('I love your enthusiasm, but please return to a Discord channel to end the event.');
					return;
				}
				command = EndPOAP(guildMember, ctx.options.end['platform'], ctx);
				break;
			case 'distribute':
				command = DistributePOAP(ctx, guildMember, ctx.options.distribute['event'], ctx.options.distribute['platform']);
				break;
			case 'claim':
				command = ClaimPOAP(ctx, ctx.options.claim.platform, guildMember);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			this.handleCommandError(ctx, command);
			return;
		} catch (e) {
			LogUtils.logError('failed to process POAP command', e);
			await ServiceUtils.sendOutErrorMessage(ctx);
			return;
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.catch(async e => {
			if (e instanceof ValidationError) {
				await ctx.sendFollowUp({ content: `${e.message}`, ephemeral: true });
				return;
			} else if (e instanceof EarlyTermination) {
				await ctx.sendFollowUp({ content: `${e.message}`, ephemeral: true });
				return;
			} else {
				LogUtils.logError('failed to handle poap command', e);
				await ServiceUtils.sendOutErrorMessage(ctx);
				return;
			}
		});
	}
};
