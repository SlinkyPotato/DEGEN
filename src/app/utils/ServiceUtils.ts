/**
 * Utilities for service layer
 */
import {
	AwaitMessagesOptions,
	Collection,
	DMChannel,
	EmbedField,
	Guild,
	GuildMember,
	Message,
	MessageActionRow,
	MessageButton,
	MessageEmbedOptions,
	MessageOptions,
	Permissions,
	Snowflake,
	StageChannel,
	TextChannel,
	User,
	VoiceChannel,
} from 'discord.js';
import client from '../app';
import Log from './Log';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { POAPFileParticipant,
	TwitterPOAPFileParticipant } from './POAPUtils';
import { ButtonStyle,
	CommandContext,
	ComponentType,
	Message as MessageSlash,
	MessageOptions as MessageOptionsSlash,
	EmbedField as EmbedFieldSlash,
	MessageEmbedOptions as MessageEmbedOptionsSlash,
} from 'slash-create';
import { ComponentActionRow } from 'slash-create';
import ValidationError from '../errors/ValidationError';
import {
	Db,
	Collection as MongoCollection,
} from 'mongodb';
import MongoDbUtils from './MongoDbUtils';
import constants from '../service/constants/constants';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';
import { DiscordServerCollection } from '../types/discord/DiscordServerCollection';

const ServiceUtils = {
	async getGuildAndMember(guildId: string, userId: string): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(guildId);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(userId),
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
	
	formatDisplayDate(dateIso: string): string {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		};
		return (new Date(dateIso)).toLocaleString('en-US', options);
	},
	
	getAllVoiceChannels(guildMember: GuildMember): Collection<string, VoiceChannel | StageChannel> {
		return guildMember.guild.channels.cache
			.filter(guildChannel =>
				(guildChannel.type === 'GUILD_VOICE'
					|| guildChannel.type === 'GUILD_STAGE_VOICE')) as Collection<string, VoiceChannel | StageChannel>;
	},

	/**
	 * Returns the first message in channel from the user
	 * @param guildMember guild user that initiated the command
	 * @param dmChannel direct message channel
	 * @param waitInMilli number of milliseconds the bot should wait for a reply
	 */
	async getFirstUserReply(
		guildMember: GuildMember, dmChannel: DMChannel | TextChannel, waitInMilli?: number,
	): Promise<any> {
		waitInMilli = (waitInMilli == null) ? 600000 : waitInMilli;
		const message: Message | undefined = (await dmChannel.awaitMessages({
			max: 1,
			time: waitInMilli,
			errors: ['time'],
			filter: m => m.author.id == guildMember.user.id,
		} as AwaitMessagesOptions)).first();
		if (message == null) {
			throw new ValidationError('Could not find message, please try command again');
		}
		return message.content;
	},
	
	async tryDMUser(guildMember: GuildMember, message: string): Promise<boolean> {
		try {
			await guildMember.send({ content: message });
			return true;
		} catch (e) {
			Log.warn(`DM is turned off for ${guildMember.user.tag}`);
			return false;
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
		Log.debug('finishing csv buffer');
		return Buffer.from(csvString, 'utf-8');
	},
	
	parseCSVFile: (csvFile: string): POAPFileParticipant[] | TwitterPOAPFileParticipant[] => {
		Log.debug('starting to parse csv file...');
		const records: POAPFileParticipant[] | TwitterPOAPFileParticipant[] = parse(csvFile, {
			columns: true,
			skip_empty_lines: true,
		});
		Log.debug('done parsing csv file');
		return records;
	},
	
	sendOutErrorMessage: async (ctx: CommandContext, msg?: string): Promise<any> => {
		const row: ComponentActionRow = {
			type: ComponentType.ACTION_ROW,
			components: [{
				type: ComponentType.BUTTON,
				style: ButtonStyle.LINK,
				label: 'Support',
				url: 'https://discord.gg/NRj43H83nJ',
			}],
		};
		try {
			await ctx.send({
				content: msg ? msg : 'Something is not working. Please reach out to us and a support member will happily assist!',
				ephemeral: true,
				components: [row],
			}).catch(Log.error);
		} catch (e) {
			Log.error(e);
		}
	},
	
	sendOutErrorMessageForDM: async (dmChannel: DMChannel, msg?: string): Promise<any> => {
		const row: MessageActionRow = new MessageActionRow().addComponents(
			new MessageButton()
				.setURL('https://discord.gg/NRj43H83nJ')
				.setStyle('LINK')
				.setLabel('Support'),
		);
		try {
			await dmChannel.send({
				content: msg ? msg : 'Something is not working. Please reach out to us and a support member will happily assist!',
				components: [row],
			}).catch(Log.error);
		} catch (e) {
			Log.error(e);
		}
	},
	
	sendContextMessage: async (
		isDmOn: boolean,
		guildMember: GuildMember,
		ctx: CommandContext,
		msg: MessageOptions | MessageOptionsSlash,
	): Promise<Message | MessageSlash> => {
		if (isDmOn) {
			return await guildMember.send(msg as MessageOptions);
		} else {
			return await ctx.send(msg as MessageOptionsSlash) as MessageSlash;
		}
	},
	
	generateEmbedFieldsMessage: (
		isDmOn: boolean,
		embedFieldsList: EmbedField[] | EmbedFieldSlash[],
		title: string,
		description: string,
	): MessageOptionsSlash | MessageOptions => {
		Log.debug(`starting to process  ${embedFieldsList.length} embedFields`);
		let i, j;
		const chunk = 25;
		let slicedArray: EmbedField[] | EmbedFieldSlash[];
		const embedsList: MessageEmbedOptions[] | MessageEmbedOptionsSlash[] = [];
		for (i = 0, j = embedFieldsList.length; i < j; i += chunk) {
			slicedArray = embedFieldsList.slice(i, i + chunk);
			embedsList.push({
				title: title,
				description: description,
				fields: slicedArray,
			});
		}
		Log.debug(`finished processing ${embedFieldsList.length} embed fields`);
		if (isDmOn) {
			return {
				embeds: embedsList as MessageEmbedOptions[],
			} as MessageOptions;
		}
		return {
			embeds: embedsList as MessageEmbedOptionsSlash[],
			ephemeral: true,
		} as MessageOptionsSlash;
	},
	
	isDMEnabledForUser: async (member: GuildMember): Promise<boolean> => {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const dbUsers: MongoCollection<DiscordUserCollection> = await db.collection(constants.DB_COLLECTION_DISCORD_USERS);
		await member.fetch();
		const result: DiscordUserCollection | null = await dbUsers.findOne({
			userId: member.id.toString(),
		});
		
		if (result == null) {
			return false;
		}
		
		return result.isDMEnabled;
	},

	addActiveDiscordServer: async (guild: Guild): Promise<void> => {
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordServerCollection = await db.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
		Log.info(`${constants.APP_NAME} active for: ${guild.id}, ${guild.name}`);
		await discordServerCollection.updateOne({
			serverId: guild.id.toString(),
		}, {
			$set: {
				serverId: guild.id.toString(),
				name: guild.name,
				isDEGENActive: true,
			},
		}, {
			upsert: true,
		});
	},
};

export default ServiceUtils;
