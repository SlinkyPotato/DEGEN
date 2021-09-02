import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import StartPOAP from '../../service/poap/StartPOAP';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';

module.exports = class poap extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'poap',
			description: 'Receive a list of all attendees in the specified voice channel and optionally send out POAP links',
			options: [
				{
					name: 'start',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Begin POAP event and start tracking participants.',
					options: [
						{
							name: 'event',
							type: CommandOptionType.STRING,
							description: 'The event name for the discussion',
						},
					],
				},
				{
					name: 'end',
					type: CommandOptionType.SUB_COMMAND,
					description: 'End POAP event and receive a list of participants.',
				},
				{
					name: 'distribute',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Distribute links to existing attendees',
				},
			],
			throttling: {
				usages: 1,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot || ctx.guildID == undefined) return 'Please try /poap within discord channel.';
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
				// command = EndPOAP(guildMember);
				break;
			case 'distribute':
				console.log(`/poap distribute event:${ctx.options.distribute.event}`);
				// command = DistributePOAP(guildMember);
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
			} else if (e instanceof EarlyTermination) {
				return ctx.send(e.message);
			} else {
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
};

// export const getAllowedUsers = (): ApplicationCommandPermissions[] =>{
// 	const poapManagers: string[] = (process.env.DISCORD_POAP_MANAGERS).split(',');
// 	const allowedPermissions: ApplicationCommandPermissions[] = [];
// 	for (const poapManagerId of poapManagers) {
// 		allowedPermissions.push({
// 			type: ApplicationCommandPermissionType.USER,
// 			id: poapManagerId,
// 			permission: true,
// 		});
// 	}
// 	allowedPermissions.push({
// 		type: ApplicationCommandPermissionType.ROLE,
// 		id: roleIDs.admin,
// 		permission: true,
// 	});
// 	return allowedPermissions;
// };
