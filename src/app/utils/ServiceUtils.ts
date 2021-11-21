/**
 * Utilities for service layer
 */
import {
	Collection,
	DMChannel,
	Guild,
	GuildMember,
	Permissions,
	Role,
	RoleManager,
	Snowflake,
	StageChannel,
	User,
	VoiceChannel,
} from 'discord.js';
import { CommandContext } from 'slash-create';
import client from '../app';
import ValidationError from '../errors/ValidationError';
import roleIDs from '../service/constants/roleIds';
import discordServerIds from '../service/constants/discordServerIds';
import Log, { LogUtils } from './Log';
import { stringify } from 'csv-stringify/sync';

const ServiceUtils = {
	async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(ctx.user.id),
		};
	},

	async getGuildMemberFromUser(user: User, guildID: string): Promise<GuildMember> {
		const guild = await client.guilds.fetch(guildID);
		return await guild.members.fetch(user.id);
	},

	async getMembersWithRoles(guild: Guild, roles: string[]): Promise<Collection<Snowflake, GuildMember>> {
		const guildMembers = await guild.members.fetch();
		return guildMembers.filter(member => {
			return ServiceUtils.hasSomeRole(member, roles);
		});
	},

	getGuestRole(roles: RoleManager): Role {
		return roles.cache.find((role) => {
			return role.id === roleIDs.guestPass;
		});
	},

	getAFKRole(roles: RoleManager): Role {
		return roles.cache.find((role) => {
			return role.id === roleIDs.AFK;
		});
	},
	
	getRole(roleManager: RoleManager, roleName: string): Role {
		return roleManager.cache.find(role => {
			return role.name === roleName;
		});
	},

	hasRole(guildMember: GuildMember, role: string): boolean {
		return guildMember.roles.cache.some(r => r.id === role);
	},

	hasSomeRole(guildMember: GuildMember, roles: string[]): boolean {
		for (const role of roles) {
			if (ServiceUtils.hasRole(guildMember, role)) {
				return true;
			}
		}
		return false;
	},
	
	isDiscordAdmin(guildMember: GuildMember): boolean {
		return guildMember.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
	},
	
	isDiscordServerManager(guildMember: GuildMember): boolean {
		return guildMember.permissions.has(Permissions.FLAGS.MANAGE_GUILD);
	},

	isAnyLevel(guildMember: GuildMember): boolean {
		return ServiceUtils.hasSomeRole(guildMember, [
			roleIDs.level1,
			roleIDs.level2,
			roleIDs.level3,
			roleIDs.level4,
		]);
	},

	isAtLeastLevel1(guildMember: GuildMember): boolean {
		return ServiceUtils.hasSomeRole(guildMember, [
			roleIDs.level1,
			roleIDs.level2,
			roleIDs.level3,
			roleIDs.level4,
			roleIDs.admin,
			roleIDs.genesisSquad,
		]);
	},

	isAtLeastLevel2(guildMember: GuildMember): boolean {
		return ServiceUtils.hasSomeRole(guildMember, [
			roleIDs.level2,
			roleIDs.level3,
			roleIDs.level4,
			roleIDs.admin,
			roleIDs.genesisSquad,
		]);
	},
	
	validateLevel2AboveMembers(guildMember: GuildMember): void {
		if (!(ServiceUtils.isAtLeastLevel2(guildMember))) {
			throw new ValidationError('Must be `level 2` or above member.');
		}
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
	
	isBanklessDAO(guild: Guild): boolean {
		if (guild == null || guild.id == null) {
			return false;
		}
		return guild.id == discordServerIds.banklessDAO || guild.id == discordServerIds.discordBotGarage;
	},
	
	getAllVoiceChannels(guildMember: GuildMember): Collection<string, VoiceChannel | StageChannel> {
		return guildMember.guild.channels.cache
			.filter(guildChannel =>
				(guildChannel.type === 'GUILD_VOICE'
					|| guildChannel.type === 'GUILD_STAGE_VOICE')) as Collection<string, VoiceChannel | StageChannel>;
	},

	/**
	 * Returns the first message in DM channel from the user
	 * @param dmChannel direct message channel
	 * @param waitInMilli number of milliseconds the bot should wait for a reply
	 */
	async getFirstUserReply(dmChannel: DMChannel, waitInMilli?: number): Promise<any> {
		waitInMilli = (waitInMilli == null) ? 600000 : waitInMilli;
		return (await dmChannel.awaitMessages({
			max: 1,
			time: waitInMilli,
			errors: ['time'],
		})).first().content;
	},
	
	async tryDMUser(guildMember: GuildMember, message: string): Promise<any> {
		try {
			await guildMember.send({ content: message });
		} catch (e) {
			LogUtils.logError('DM is turned off', e);
			throw new ValidationError('I\'m trying to send you a DM... Can you try turning DMs on?');
		}
	},
	
	prepEmbedField: (field: string | null): string => {
		return (field) ? field : '-';
	},
	
	generateCSVStringBuffer: (listOfObjects: any[]): Buffer => {
		Log.debug('starting the generate csv buffer...');
		if (listOfObjects.length === 0) {
			Log.debug('no participants found for parsing');
			return Buffer.from('', 'utf-8');
		}
		const csvString = stringify(listOfObjects, {
			header: true,
		});
		Log.debug('finishing parsing twitter participants');
		return Buffer.from(csvString, 'utf-8');
	},
	
	parseCSVFile: () => {
		return;
	},
};

export default ServiceUtils;
