import {
	CommandContext,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import constants from '../../service/constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import { Db } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import POAPUtils from '../../utils/POAPUtils';
import { GuildMember } from 'discord.js';
import ValidationError from '../../errors/ValidationError';

export default class Invite extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'invite',
			description: 'Get the invite link for the new POAP bot!',
			throttling: {
				usages: 50,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;
		
		try {
			if (ctx.guildID) {
				const guildMember: GuildMember = (await ServiceUtils.getGuildAndMember(ctx.guildID, ctx.user.id)).guildMember;
				const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
				await POAPUtils.validateUserAccess(guildMember, db);
				await ctx.send({ content: `Check out our new POAP bot! ${constants.INVITE_BOT_POAP_LINK}`, ephemeral: true });
			} else {
				await ctx.send({ content: 'Please try running the command within a discord server' });
			}
		} catch (e) {
			if (e instanceof ValidationError) {
				await ctx.send({ content: `${e.message}`, ephemeral: true }).catch(Log.error);
				return;
			} else {
				LogUtils.logError('failed to handle command', e);
				await ServiceUtils.sendOutErrorMessage(ctx);
			}
		}
	}
}