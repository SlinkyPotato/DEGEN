import {
	ApplicationCommandPermissions,
	ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import roleIDs from '../../service/constants/roleIds';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/StartPOAP';
import EndPOAP from '../../service/poap/EndPOAP';
import ValidationError from '../../errors/ValidationError';
import poapEvents from '../../service/constants/poapEvents';
import DistributePOAP from '../../service/poap/DistributePOAP';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					name: 'start',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Begin POAP event and start tracking participants.',
					options: [
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event for the discussion, most likely a guild or community call',
							choices: [
								{
									name: 'Community Call',
									value: poapEvents.COMMUNITY_CALL,
								},
								{
									name: 'Dev Guild',
									value: poapEvents.DEV_GUILD,
								},
								{
									name: 'Writer\'s Guild',
									value: poapEvents.WRITERS_GUILD,
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
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event for the discussion, most likely a guild or community call',
							choices: [
								{
									name: 'Community Call',
									value: poapEvents.COMMUNITY_CALL,
								},
								{
									name: 'Dev Guild',
									value: poapEvents.DEV_GUILD,
								},
								{
									name: 'Writer\'s Guild',
									value: poapEvents.WRITERS_GUILD,
								},
							],
						},
					],
				},
				{
					name: 'distribute',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Distribute links to existing attendees',
					options: [
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event for the discussion, most likely a guild or community call',
							choices: [
								{
									name: 'Community Call',
									value: poapEvents.COMMUNITY_CALL,
								},
								{
									name: 'Dev Guild',
									value: poapEvents.DEV_GUILD,
								},
								{
									name: 'Writer\'s Guild',
									value: poapEvents.WRITERS_GUILD,
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
				[process.env.DISCORD_SERVER_ID]: getAllowedUsers(),
			},
		});
	}
	
	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`start /poap ${ctx.user.username}#${ctx.user.discriminator}`);
		
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		let command: Promise<any>;
		
		try {
			switch (ctx.subcommands[0]) {
			case 'start':
				console.log(`/poap start event:${ctx.options.start.event}`);
				command = StartPOAP(guildMember, ctx.options.start.event);
				break;
			case 'end':
				console.log(`/poap end event:${ctx.options.end.event}`);
				command = EndPOAP(guildMember, ctx.options.end.event);
				break;
			case 'distribute':
				console.log(`/poap distribute event:${ctx.options.distribute.event}`);
				command = DistributePOAP(guildMember, ctx.options.distribute.event);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			return this.handleCommandError(ctx, command);
		} catch (e) {
			console.error(e);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then(() => {
			console.log(`end /poap ${ctx.user.username}#${ctx.user.discriminator}`);
			return ctx.send(`${ctx.user.mention} DM sent!`);
		}).catch(e => {
			console.error('ERROR', e);
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else {
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
};

export const getAllowedUsers = (): ApplicationCommandPermissions[] =>{
	const poapManagers: string[] = (process.env.DISCORD_POAP_MANAGERS).split(',');
	const allowedPermissions: ApplicationCommandPermissions[] = [];
	for (const poapManagerId of poapManagers) {
		allowedPermissions.push({
			type: ApplicationCommandPermissionType.USER,
			id: poapManagerId,
			permission: true,
		});
	}
	allowedPermissions.push({
		type: ApplicationCommandPermissionType.ROLE,
		id: roleIDs.admin,
		permission: true,
	});
	return allowedPermissions;
};