import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import ValidationError from '../../errors/ValidationError';
import EarlyTermination from '../../errors/EarlyTermination';
import Log, { LogUtils } from '../../utils/Log';
import ClaimPOAP from '../../service/poap/ClaimPOAP';
import constants from '../../service/constants/constants';
import { GuildMember } from 'discord.js';
import { command } from '../../utils/SentryUtils';

export default class POAP extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'claim',
			description: 'Claim your POAPs.',
			throttling: {
				usages: 20,
				duration: 1,
			},
			defaultPermission: true,
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
		});
	}

	@command
	async run(ctx: CommandContext): Promise<void> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;

		let guildMember: GuildMember | undefined;
		let commandPromise: Promise<any> | null = null;
		let platform: string;

		try {
			if (ctx.guildID) {
				guildMember = (await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id)).guildMember;
			}

			platform = ctx.options.platform != null && ctx.options.platform != '' ? ctx.options.platform : constants.PLATFORM_TYPE_DISCORD;
			Log.debug(`platform: ${platform}`);
			commandPromise = ClaimPOAP(ctx, platform, guildMember);
			if (commandPromise == null) {
				ServiceUtils.sendOutErrorMessage(ctx).catch(Log.error);
				return;
			}
		} catch (e) {
			LogUtils.logError('failed to process POAP command', e);
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
		}
	}
}
