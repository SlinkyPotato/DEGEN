import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import { LogUtils } from '../../utils/Log';
import constants from '../../service/constants/constants';

export default class POAP extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links.',
			options: [
				{
					name: 'config',
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Configure users and roles to have access to POAP commands.',
					options: [
						{
							name: 'status',
							description: 'Display the list of authorized users and roles that can use the POAP commands.',
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
					description: 'Claim POAPs for all the events DEGEN failed to deliver.',
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
			throttling: {
				usages: 10,
				duration: 1,
			},
			defaultPermission: true,
		});
	}
	
	async run(ctx: CommandContext): Promise<void> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		try {
			
			await ctx.send({ content: 'DEGEN is getting replaced by a new POAP bot, try out /invite command to get a special link!', ephemeral: true });
		} catch (e) {
			LogUtils.logError('failed to process POAP command', e);
			await ServiceUtils.sendOutErrorMessage(ctx);
			return;
		}
	}
}