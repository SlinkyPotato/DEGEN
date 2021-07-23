/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import { GuildMember } from 'discord.js';
import client from '../app';

const serviceUtils = {
	async getGuildMember(ctx: CommandContext): Promise<GuildMember> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return guild.members.fetch(ctx.user.id);
	},
};

export default serviceUtils;