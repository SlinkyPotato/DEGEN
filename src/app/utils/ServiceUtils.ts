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
import { Db } from 'mongodb';
import { CommandContext } from 'slash-create';
import client from '../app';
import ValidationError from '../errors/ValidationError';
import constants from '../service/constants/constants';
import roleIDs from '../service/constants/roleIds';
import { Allowlist } from '../types/discord/Allowlist';
import { Confusables } from './Confusables';
import discordServerIds from '../service/constants/discordServerIds';
import Log, { LogUtils } from './Log';
import MongoDbUtils from '../utils/MongoDbUtils';

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
			Log.log(`Skipping username spam filter because ${member.user.tag} is not bannable.`);
			return false;
		}

		if (await ServiceUtils.onAllowlist(member)) {
			Log.log(`Skipping username spam filter because ${member.user.tag} is on the allowlist.`);
			return false;
		}

		const highRankingMembers = await ServiceUtils.getMembersWithRoles(member.guild,
			[roleIDs.genesisSquad, roleIDs.admin, roleIDs.level2]);

		// Sanitize high-ranking member names in preparation for comparing them to new member nickname
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

		if ((nickname && (highRankingNames.includes(nickname) || constants.BANNED_NAMES.includes(nickname)))
			|| highRankingNames.includes(username) || constants.BANNED_NAMES.includes(username)) {
			const debugMessage = `Nickname: ${member.displayName}. Username: ${member.user.tag}.`;

			// Fetch admin contacts
			const aboveAverageJoe = await member.guild.members.fetch('198981821147381760');
			const frogmonkee = await member.guild.members.fetch('197852493537869824');

			// Send DM to user before banning them because bot can't DM user after banning them.
			await member.send(`You were auto-banned from the ${member.guild.name} server. If you believe this was a mistake, please contact <@${aboveAverageJoe.id}> or <@${frogmonkee.id}>.`)
				.catch(e => {
					// Users that have blocked the bot or disabled DMs cannot receive a DM from the bot
					Log.log(`Unable to message user before auto-banning them. ${debugMessage} ${e}`);
				});

			await member.ban({ reason: `Auto-banned by username spam filter. ${debugMessage}` })
				.then(() => {
					Log.log(`Auto-banned user. ${debugMessage}`);
				})
				.catch(e => {
					Log.log(`Unable to auto-ban user. ${debugMessage} ${e}`);
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

	/**
	 * Checks if member is on allowlist for guild.
	 *
	 * @param member guild member object
	 * @returns boolean indicating if member is on allowlist for guild
	 */
	async onAllowlist(member: GuildMember): Promise<boolean> {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const dbAllowlist = db.collection(constants.DB_COLLECTION_ALLOWLIST);

		const allowlist: Allowlist = await dbAllowlist.findOne({
			discordUserId: member.user.id,
			discordServerId: member.guild.id,
		});

		if (allowlist) {
			return true;
		}

		return false;
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
	
};

export default ServiceUtils;
