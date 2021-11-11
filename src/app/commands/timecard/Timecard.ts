/* eslint-disable no-console */
import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ValidationError from '../../errors/ValidationError';
import ServiceUtils from '../../utils/ServiceUtils';
import Checkin from '../../service/timecard/Checkin';
import Checkout from '../../service/timecard/Checkout';
import Hours from '../../service/timecard/Hours';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';

export default class Timecard extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'timecard',
			description: 'Checkin, checkout, and calculate total hours',
			guildIDs: [process.env.DISCORD_SERVER_ID, discordServerIds.discordBotGarage],
			options: [
				{
					name: 'checkin',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Initiate time card.',
				},
				{
					name: 'checkout',
					type: CommandOptionType.SUB_COMMAND,
					description: 'End and log timecard.',
					options: [
						{
							name: 'description',
							type: CommandOptionType.STRING,
							description: 'Brief description of what you are working on.',
							required: true,
						},
					],
				},
				{
					name: 'hours',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Calculate total hours worked.',
				},
			],
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
		let command: Promise<any>;
		
		try {
			switch (ctx.subcommands[0]) {
			case 'checkin':
				command = Checkin(guildMember, Date.now());
				break;
			case 'checkout':
				command = Checkout(guildMember, Date.now(), ctx.options.checkout['description']);
				break;
			case 'hours':
				command = Hours(guildMember);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			this.handleCommandError(ctx, command);
		} catch (e) {
			console.error(e);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>): void {
		command.then(() => {
			return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else {
				LogUtils.logError('failed to handle timecard command', e);
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
}