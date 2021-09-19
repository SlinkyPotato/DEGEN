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
	Snowflake
} from 'discord.js';
import client from '../app';
import roleIDs from '../service/constants/roleIds';
import ValidationError from '../errors/ValidationError';
import { Confusables } from "./Confusables";

const nonStandardCharsRegex = /[^\w\s\p{P}\p{S}Ξ]/gu;
const emojiRegex = /\p{So}/gu
const whitespaceRegex = /[\s]/g

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

	isAtLeastLevel2(guildMember: GuildMember): boolean {
		const isLevel2 = ServiceUtils.isLevel2(guildMember);
		const isLevel3 = ServiceUtils.isLevel3(guildMember);
		const isLevel4 = ServiceUtils.isLevel4(guildMember);
		const isGenesisSquad = ServiceUtils.isGenesisSquad(guildMember);
		const isAdmin = ServiceUtils.isAdmin(guildMember);

		return isLevel2 || isLevel3 || isLevel4 || isAdmin || isGenesisSquad;
	},
	
	validateLevel2AboveMembers(guildMember: GuildMember): void {
		if (!(ServiceUtils.isAtLeastLevel2(guildMember))) {
			throw new ValidationError('Must be `level 2` or above member.');
		}
	},

	/**
	 * Bans a guild member if they have a nickname or username similar to that of a high ranking member 
	 * of the Discord. 
	 * 
	 * @param member guild member object
	 * @returns boolean indicating if user was banned
	 */
	async runUsernameSpamFilter(member: GuildMember): Promise<boolean> {
		if(ServiceUtils.isAtLeastLevel2(member)) {
			return false;
		}

		if (!member.bannable) {
			console.log(`Skipping username spam filter because ${member.user.tag} is not bannable.`)
			return false;
		}

		const guild = await member.guild.fetch();

		const highRankingMembers = await ServiceUtils.getMembersWithRoles(guild, 
			[roleIDs.genesisSquad, roleIDs.admin, roleIDs.level2]);

		// Sanitize high-ranking member names in prepartion for comparing them to new member nickname
        const highRankingNames = highRankingMembers.map(member => {
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

		if ((nickname && highRankingNames.includes(nickname)) || highRankingNames.includes(username)) {
			// Send DM to user before banning them because bot can't DM user after banning them. 
			await member.send(`You were auto-banned from the ${guild.name} server. If you believe this was a mistake, please contact <@198981821147381760> or <@197852493537869824>.`)
				.catch(e => {
					// Users that have blocked the bot or disabled DMs cannot receive a DM from the bot
					console.log(`Unable to message ${member.user.tag} before auto-banning them. ${e}`)
				}) 

			await member.ban({reason: 'Autobanned for having similar nickname or username as high-ranking member.'})
				.then(() => {
					console.log(`Auto-banned ${member.user.tag}`);
				})
				.catch(e => {
					console.log(`Unable to auto-ban ${member.user.tag}. ${e}`)
				}) 
			
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
	sanitizeUsername(name: string) {
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