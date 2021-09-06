/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import { Guild, GuildMember, Role, RoleManager } from 'discord.js';
import client from '../app';
import roleIDs from '../service/constants/roleIds';
import ValidationError from '../errors/ValidationError';

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
	
	isGenesisSquad(guildMember: GuildMember): boolean {
		return guildMember.roles.cache.some(role => role.id === roleIDs.genesisSquad);
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
	
	validateLevel2AboveMembers(guildMember: GuildMember): void {
		const isLevel2 = ServiceUtils.isLevel2(guildMember);
		const isLevel3 = ServiceUtils.isLevel3(guildMember);
		const isLevel4 = ServiceUtils.isLevel4(guildMember);
		const isGenesisSquad = ServiceUtils.isGenesisSquad(guildMember);
		const isAdmin = ServiceUtils.isAdmin(guildMember);

		if (!(isLevel2 || isLevel3 || isLevel4 || isAdmin || isGenesisSquad)) {
			throw new ValidationError('Must be `level 2` or above member.');
		}
	},
};

export default ServiceUtils;