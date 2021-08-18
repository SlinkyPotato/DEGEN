/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import { Guild, GuildMember, Role, RoleManager } from 'discord.js';
import client from '../app';
import roleIDs from '../service/constants/roleIds';

const ServiceUtils = {
	async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(ctx.user.id),
		};
	},

	getGuestRole(roles: RoleManager): Role {
		return roles.cache.find((role) => {
			return role.id === roleIDs.guestPass;
		});
	},
	
	isAdmin(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.admin);
	},
	
	isLevel1(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.level1);
	},

	isLevel2(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.level2);
	},

	isLevel3(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.level3);
	},

	isLevel4(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.level4);
	},
	
	isAnyLevel(guildMember: GuildMember): boolean {
		console.log(guildMember.roles.cache);
		return guildMember.roles.cache.some(role => role.id === roleIDs.level1
			|| role.id === roleIDs.level2 || role.id === roleIDs.level3 || role.id === roleIDs.level4);
	},
	
	formatDisplayDate(dateIso: string): string {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		};
		return (new Date(dateIso)).toLocaleString('en-US', options);
	},
};

export default ServiceUtils;