import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/start/StartPOAP';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';
import EndPOAP from '../../service/poap/end/EndPOAP';
import DistributePOAP from '../../service/poap/DistributePOAP';
import SchedulePOAP from '../../service/poap/SchedulePOAP';
import Log, { LogUtils } from '../../utils/Log';
import ClaimPOAP from '../../service/poap/ClaimPOAP';
import constants from '../../service/constants/constants';
import { GuildMember } from 'discord.js';
import { command } from '../../utils/SentryUtils';

export default class POAP extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links.',
			throttling: {
				usages: 10,
				duration: 1,
			},
			defaultPermission: true,
			options: [
				{
					name: 'mint',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Mint a POAP for an event, upload the PNG image to be minted, and get the links.txt file over email.',
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
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The name of the event that participants will see in their DMs.',
							required: true,
						},
						{
							name: 'duration',
							type: CommandOptionType.STRING,
							description: 'Number of minutes the event will remain active.',
							required: false,
						},
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'The hosting location of the POAP event.',
							required: false,
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
					name: 'end',
					type: CommandOptionType.SUB_COMMAND,
					description: 'End POAP event and receive a list of participants.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'The hosting location of the POAP event.',
							required: false,
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
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The name of the event that participants will see in their DMs.',
							required: true,
						},
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'Platform where users can claim from where they attended the event.',
							required: false,
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
					name: 'claim',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Claim your POAPs.',
					options: [
						{
							name: 'platform',
							type: CommandOptionType.STRING,
							description: 'Platform where users can claim from where they attended the event.',
							required: false,
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
		});
	}
	
	@command
	async run(ctx: CommandContext): Promise<void> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		const subCommand: string = ctx.subcommands[0];
		
		let guildMember: GuildMember | undefined;
		let commandPromise: Promise<any> | null = null;
		let platform: string;
		
		try {
			if (ctx.guildID) {
				guildMember = (await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id)).guildMember;
			}
			
			if (subCommand != 'claim' && !guildMember) {
				await ctx.send({ content: 'Please try command within discord server.', ephemeral: true });
				return;
			}
			
			switch (subCommand) {
			case 'mint':
				commandPromise = SchedulePOAP(ctx, guildMember as GuildMember, ctx.options.mint['mint-copies']);
				break;
			case 'start':
				platform = ctx.options.start['platform'] != null && ctx.options.start['platform'] != '' ? ctx.options.start['platform'] : constants.PLATFORM_TYPE_DISCORD;
				Log.debug(`platform: ${platform}`);
				commandPromise = StartPOAP(ctx, guildMember as GuildMember, platform, ctx.options.start.event, ctx.options.start['duration']);
				break;
			case 'end':
				platform = ctx.options.end['platform'] != null && ctx.options.end['platform'] != '' ? ctx.options.end['platform'] : constants.PLATFORM_TYPE_DISCORD;
				Log.debug(`platform: ${platform}`);
				commandPromise = EndPOAP(guildMember as GuildMember, platform, ctx);
				break;
			case 'distribute':
				platform = ctx.options.distribute['platform'] != null && ctx.options.distribute['platform'] != '' ? ctx.options.distribute['platform'] : constants.PLATFORM_TYPE_DISCORD;
				Log.debug(`platform: ${platform}`);
				commandPromise = DistributePOAP(ctx, guildMember as GuildMember, ctx.options.distribute['event'], platform);
				break;
			case 'claim':
				platform = ctx.options.claim.platform != null && ctx.options.claim.platform != '' ? ctx.options.claim.platform : constants.PLATFORM_TYPE_DISCORD;
				Log.debug(`platform: ${platform}`);
				commandPromise = ClaimPOAP(ctx, platform, guildMember);
				break;
			default:
				await ctx.send({ content: 'Please try another command.', ephemeral: true }).catch(Log.error);
				return;
			}
			await this.handleCommandError(ctx, commandPromise);
			return;
		} catch (e) {
			LogUtils.logError('failed to process POAP command', e);
			await ServiceUtils.sendOutErrorMessage(ctx);
			return;
		}
	}

	async handleCommandError(ctx: CommandContext, commandPromise?: Promise<any> | null): Promise<void> {
		if (commandPromise == null) {
			ServiceUtils.sendOutErrorMessage(ctx).catch(Log.error);
			return;
		}
		await commandPromise.catch(async e => {
			if (e instanceof ValidationError) {
				await ServiceUtils.sendOutErrorMessage(ctx, `${e?.message}`);
				return;
			} else if (e instanceof EarlyTermination) {
				await ctx.sendFollowUp({ content: `${e?.message}`, ephemeral: true }).catch(Log.error);
				return;
			} else {
				LogUtils.logError('failed to handle poap command', e);
				await ServiceUtils.sendOutErrorMessage(ctx);
			}
		});
	}
}
