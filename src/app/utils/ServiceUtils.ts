/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import { Guild, GuildMember } from 'discord.js';
import client from '../app';
import roleIDs from '../constants/roleIDs';

const ServiceUtils = {
	async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(ctx.user.id),
		};
	},
	
	isUserAdmin(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.admin);
	},
};

export default ServiceUtils;