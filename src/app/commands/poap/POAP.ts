import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/StartPOAP';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';
import EndPOAP from '../../service/poap/EndPOAP';
import DistributePOAP from '../../service/poap/DistributePOAP';
import ConfigPOAP from '../../service/poap/ConfigPOAP';
import SchedulePOAP from '../../service/poap/SchedulePOAP';
import { LogUtils } from '../../utils/Log';
import ClaimPOAP from '../../service/poap/ClaimPOAP';
import constants from '../../service/constants/constants';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links',
			options: [
				{
					name: 'config',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Configure users and roles to have access to POAP commands.',
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
							description: 'Where will the poap event be hosted?',
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
							description: 'The event name for the discussion',
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
							name: 'code',
							type: CommandOptionType.STRING,
							description: 'Claim code used for failed delivery participants.',
							required: false,
						},
					],
				},
				{
					name: 'distribute',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Distribute links to participants.',
					options: [
						{
							name: 'type',
							type: CommandOptionType.STRING,
							description: 'Type of distribution',
							required: true,
							choices: [
								{
									name: 'Manual Delivery',
									value: 'MANUAL_DELIVERY',
								},
								{
									name: 'Redeliver Failed Participants',
									value: 'REDELIVER_FAILED_PARTICIPANTS',
								},
							],
						},
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event name for the distribution',
							required: true,
						},
						{
							name: 'code',
							type: CommandOptionType.STRING,
							description: 'Claim code used for failed delivery participants.',
							required: false,
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
							description: 'Claim code given by the community organizer.',
							required: true,
							choices: [
								{
									name: 'Discord',
									value: 'DISCORD',
								},
							],
						},
						{
							name: 'code',
							type: CommandOptionType.STRING,
							description: 'Claim code given by the community organizer.',
							required: true,
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
		if (ctx.user.bot || ctx.guildID == undefined) return 'Please try /poap within discord channel.';
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		
		let command: Promise<any>;
		let authorizedRoles: any[];
		let authorizedUsers: any[];
		try {
			switch (ctx.subcommands[0]) {
			case 'config':
				authorizedRoles = [ctx.options.config['role-1'], ctx.options.config['role-2'], ctx.options.config['role-3']];
				authorizedUsers = [ctx.options.config['user-1'], ctx.options.config['user-2'], ctx.options.config['user-3']];
				command = ConfigPOAP(ctx, guildMember, authorizedRoles, authorizedUsers);
				break;
			case 'schedule':
				command = SchedulePOAP(ctx, guildMember, ctx.options.schedule['mint-copies']);
				break;
			case 'start':
				command = StartPOAP(ctx, guildMember, ctx.options.start['platform'], ctx.options.start.event, ctx.options.start['duration-minutes']);
				break;
			case 'end':
				command = EndPOAP(guildMember, ctx.options.end['code'], ctx);
				break;
			case 'distribute':
				command = DistributePOAP(ctx, guildMember, ctx.options.distribute['type'], ctx.options.distribute['event'], ctx.options.distribute['code']);
				break;
			case 'claim':
				command = ClaimPOAP(ctx, guildMember, ctx.options.claim.platform, ctx.options.claim['code']);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			this.handleCommandError(ctx, command);
			return;
		} catch (e) {
			LogUtils.logError('failed to process POAP command', e);
			return ctx.send('Welp, something is definitely broken. I would blame you, but I know better. I\'ll let my devs ' +
				'know something is wrong.');
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then((result) => {
			if (result === 'POAP_SENT') {
				return ctx.send('POAPS sent! Expect delivery shortly.');
			} else if (result === 'POAP_END') {
				return ctx.send('POAP event ended. POAPs will be delivered at a later time.');
			}
		}).catch(e => {
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else if (e instanceof EarlyTermination) {
				return ctx.send(e.message);
			} else {
				LogUtils.logError('failed to handle poap command', e);
				return ctx.send('Nothing to see here..');
			}
		});
	}
};
