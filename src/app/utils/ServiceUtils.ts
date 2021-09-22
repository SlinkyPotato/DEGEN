/**
 * Utilities for service layer
 */
import { CommandContext } from 'slash-create';
import {
	Collection,
	Guild,
	GuildMember,
	Role,
	RoleManager,
	StageChannel,
	VoiceChannel,
	Snowflake,
	User,
} from 'discord.js';
import client from '../app';
import roleIDs from '../service/constants/roleIds';
import ValidationError from '../errors/ValidationError';
import { Confusables } from './Confusables';

const nonStandardCharsRegex = /[^\w\s\p{P}\p{S}Ξ]/gu;
const emojiRegex = /\p{So}/gu;
const whitespaceRegex = /[\s]/g;

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

	isAnyLevel(guildMember: GuildMember): boolean {
		console.log(guildMember.roles.cache);
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

	/**
	 * Bans a guild member if they have a nickname or username similar to that of a high ranking member 
	 * of the Discord. 
	 * 
	 * @param member guild member object
	 * @returns boolean indicating if user was banned
	 */
	async runUsernameSpamFilter(member: GuildMember): Promise<boolean> {
		// Only enabled for BanklessDAO server
		if (member.guild.id !== process.env.DISCORD_SERVER_ID) {
			return false;
		}

		if (ServiceUtils.isAtLeastLevel1(member)) {
			return false;
		}

		if (!member.bannable) {
			console.log(`Skipping username spam filter because ${member.user.tag} is not bannable.`);
			return false;
		}

		const highRankingMembers = await ServiceUtils.getMembersWithRoles(member.guild,
			[roleIDs.genesisSquad, roleIDs.admin, roleIDs.level2]);

		// Sanitize high-ranking member names in prepartion for comparing them to new member nickname
		const highRankingNames = highRankingMembers.map(highRankingMember => {
			if (highRankingMember.nickname) {
				return ServiceUtils.sanitizeUsername(highRankingMember.nickname);
			}
			return ServiceUtils.sanitizeUsername(highRankingMember.user.username);
		});

		// New members and members resetting their nickname will not have a nickname
		let nickname = null;
		if (member.nickname) {
			nickname = ServiceUtils.sanitizeUsername(member.nickname);
		}

		const username = ServiceUtils.sanitizeUsername(member.user.username);

		if ((nickname && highRankingNames.includes(nickname)) || highRankingNames.includes(username)) {
			const debugMessage = `Nickname: ${member.displayName}. Username: ${member.user.tag}.`;
			// Send DM to user before banning them because bot can't DM user after banning them. 
			await member.send(`You were auto-banned from the ${member.guild.name} server. If you believe this was a mistake, please contact <@198981821147381760> or <@197852493537869824>.`)
				.catch(e => {
					// Users that have blocked the bot or disabled DMs cannot receive a DM from the bot
					console.log(`Unable to message user before auto-banning them. ${debugMessage} ${e}`);
				});

			await member.ban({ reason: `Auto-banned by username spam filter. ${debugMessage}` })
				.then(() => {
					console.log(`Auto-banned user. ${debugMessage}`);
				})
				.catch(e => {
					console.log(`Unable to auto-ban user. ${debugMessage} ${e}`);
				});
			
			return true;
		}

		return false;
	},

	/**
	 * Sanitizes a username by converting confusable unicode characters to latin.
	 * 
	 * @param name username to sanitize
	 * @returns sanitized username
	 */
	sanitizeUsername(name: string): string {
		return name.normalize('NFKC')
			.replace(emojiRegex, '')
			.replace(whitespaceRegex, '')
			.replace(nonStandardCharsRegex, char => Confusables.get(char) || char)
			.toLowerCase();
	},
	
	getAllVoiceChannels(guildMember: GuildMember): Collection<string, VoiceChannel | StageChannel> {
		return guildMember.guild.channels.cache
			.filter(guildChannel =>
				(guildChannel.type === 'GUILD_VOICE'
					|| guildChannel.type === 'GUILD_STAGE_VOICE')) as Collection<string, VoiceChannel | StageChannel>;
	},
};

export default ServiceUtils;