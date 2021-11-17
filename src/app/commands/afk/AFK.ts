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
		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		const AFKRole = ServiceUtils.getAFKRole(guildMember.guild.roles);
		if (!AFKRole) {
			return ctx.send('AFK Role does not exist on this server');
		}
		let command: Promise<any>;
		try {
			const isAFK : boolean = await ToggleAFK(guildMember);
			if (isAFK) {
				return ctx.send(`${ctx.user.username} has gone AFK!`);
			} else {
				return ctx.send(`Welcome back ${ctx.user.username}!`);
			}
		} catch (e) {
			this.handleCommandError(ctx, command);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>): void {
		command.then(() => {
			return ctx.send(`${ctx.user.username} Sent you a DM with information.`);
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