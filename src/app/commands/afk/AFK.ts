/* eslint-disable no-console */
import {
	CommandContext,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ValidationError from '../../errors/ValidationError';
import ServiceUtils from '../../utils/ServiceUtils';
import ToggleAFK from '../../service/AFK/ToggleAFK';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';

export default class AFK extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'afk',
			description: 'Toggle AFK Status',
			guildIDs: [process.env.DISCORD_SERVER_ID, discordServerIds.discordBotGarage],
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		const guildAndMember = await ServiceUtils.getGuildAndMember(ctx);
		const { guildMember } = guildAndMember;
		let command: Promise<any>;
		try {
			// Check if guild has afk role
			// if they don't have AFK role, prompt them to create the role
			// if they have afk role, proceed
			const AFKRole = ServiceUtils.getRoleId(guildMember.guild.roles, 'AFK');
			if (!AFKRole) {
				return ctx.send('This server does not have the AFK role yet. Use </create-role afk> to create the AFK role.');
			}
			const isAFK : boolean = await ToggleAFK(guildMember);
			if (isAFK) {
				return ctx.send(`${ctx.user.mention} has gone AFK.`);
			} else {
				return ctx.send(`Welcome back ${ctx.user.mention}!`);
			}
		} catch (e) {
			this.handleCommandError(ctx, command);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>): void {
		command.then(() => {
			return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else {
				LogUtils.logError('failed to handle AFK command', e);
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
}