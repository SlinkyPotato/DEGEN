/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import { Guild, GuildMember, Role, RoleManager, Collection, Snowflake, TextChannel } from 'discord.js';
import client from '../app';
import roleIDs from '../service/constants/roleIds';
import ValidationError from '../errors/ValidationError';
import { Confusables } from "./Confusables";

const excludeFromSanitization = /[^a-zA-Z0-9-_.,|()$ ]/g;

const ServiceUtils = {
	async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(ctx.user.id),
		};
	},

	async getMembersWithRoles(guild: Guild, roles: string[]): Promise<Collection<Snowflake, GuildMember>> {
		const guildMembers = await guild.members.fetch();
 		return guildMembers.filter(member => {
			for (let role of roles) {
				if (member.roles.cache.some(r => r.id === role)) {
					return true;
				}
			}
		})
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

	/**
	 * Bans a guild member if they have a nickname or username similar to that 
	 * of a high ranking member of the Discord.
	 * 
	 * @param member guild member object
	 * @returns boolean indicating if user was banned
	 */
	async runUsernameSpamFilter(member: GuildMember): Promise<boolean> {
		const guild = await member.guild.fetch();

		const highRankingMembers = await ServiceUtils.getMembersWithRoles(guild, 
			[roleIDs.genesisSquad, roleIDs.admin, roleIDs.level2]);

        const reservedNames = highRankingMembers.map(member => {
			if (member.nickname) {
				return ServiceUtils.sanitizeUsername(member.nickname);
			}
			return ServiceUtils.sanitizeUsername(member.user.username);
		});

		// New members and members resetting their nickname will not have a nickname
		let nickname = null;
		if (member.nickname) {
			nickname = ServiceUtils.sanitizeUsername(member.nickname);
		}

		let username = ServiceUtils.sanitizeUsername(member.user.username);

		// Ban user if their nickname or username matches an existing users nickname
		if (nickname && reservedNames.includes(nickname)) {
			member.ban({reason: `Autobanned for having similar nickname as existing member (${nickname}).`})
				.then(member => {
					const channel = guild.channels.cache.get(process.env.DISCORD_CHANNEL_BOT_AUDIT_ID) as TextChannel;
					channel.send(`Autobanned ${member} (${member.user.tag}) for having similar nickname as existing member (${nickname}).`);
				})
				.catch(console.error)
			return true;
		}

		if (reservedNames.includes(username)) {
			member.ban({reason: `Autobanned for having similar username as existing member. (${nickname})`})
				.then(member => {
					const channel = guild.channels.cache.get(process.env.DISCORD_CHANNEL_BOT_AUDIT_ID) as TextChannel;
					channel.send(`Autobanned ${member} (${member.user.tag}) for having similar username as existing member (${username}).`);
				})
				.catch(console.error)
            return true;
		}

		return false;
	},

	/**
	 * Sanitizes a username by performing the following:
	 * 	1. Convert to Unicode Normilization Form using Compatibility Decomposition.
	 * 	2. Replace unicode confusables with basic latin equivalent.
	 * 	3. Remove spaces.
	 * 	4. Convert name to lowercase.
	 * 
	 * @param name username to sanitize
	 * @returns sanitized username
	 */
	sanitizeUsername(name: string) {
		return name.normalize('NFKC')
			.replace(excludeFromSanitization, char => Confusables.get(char) || char)
			.replace(/[\s]/g, '')
			.toLowerCase();
	}
};

export default ServiceUtils;