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
	OverwriteResolvable,
	Permissions,
	Role,
	StageChannel,
	TextChannel,
	ThreadChannel,
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
import apiKeys from '../service/constants/apiKeys';
import { ChannelTypes } from 'discord.js/typings/enums';
import { getRequiredChannelPermissionsForDegenAuthorized } from '../service/setup/SetupDEGEN';

const ServiceUtils = {
	async getGuildAndMember(guildId: string, userId: string): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(guildId);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(userId),
		};
	},
	
	isDiscordAdmin(guildMember: GuildMember): boolean {
		return guildMember.permissions.has(Permissions.FLAGS.ADMINISTRATOR);
	},
	
	isDiscordServerManager(guildMember: GuildMember): boolean {
		return guildMember.permissions.has(Permissions.FLAGS.MANAGE_GUILD);
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
	
	/**
	 * Check if the channel is private where @everyone cannot view it
	 * @param channel
	 * @param guild
	 */
	isChannelPrivate(channel: TextChannel | ThreadChannel, guild: Guild): boolean {
		return !channel.permissionsFor(guild.roles.everyone).has(Permissions.FLAGS.VIEW_CHANNEL);
	},
	
	isChannelSetupForExecutor(guildMember: GuildMember, channel: TextChannel): boolean {
		if (!(channel.permissionsFor(guildMember).has(Permissions.FLAGS.VIEW_CHANNEL)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.SEND_MESSAGES)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.ATTACH_FILES)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.CREATE_PRIVATE_THREADS)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.MANAGE_MESSAGES)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.MANAGE_THREADS)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.USE_PRIVATE_THREADS)
			&& channel.permissionsFor(guildMember).has(Permissions.FLAGS.USE_APPLICATION_COMMANDS))) {
			Log.debug('channel does not have permission for degen use');
			return false;
		}
		return this.isChannelPrivate(channel, guildMember.guild);
	},
	
	// async getThreadExecution(channel: TextChannel, guildMember: GuildMember): Promise<ThreadChannel> {
	//	
	// 	if (!this.isChannelSetupForExecutor(guildMember, channel)) {
	// 		Log.debug('channel does not have proper permissions');
	// 		// return this.createChannelForExecution(channel);
	// 	}
	//
	// 	Log.debug('channel is a private thread');
	// 	return true;
	// },
	
	async createPrivateThreadForExecution(channel: TextChannel, threadName: string): Promise<ThreadChannel> {
		const thread: ThreadChannel = await channel.threads.create({
			name: threadName,
			reason: 'DEGEN command execution',
		});
		Log.debug('degen-commands thread created');
		return thread;
	},
	
	async createPrivateChannelForExecution(guild: Guild, authorizedRole: Role): Promise<TextChannel> {
		if (!guild.available) {
			Log.warn(`guild outage for, guildId: ${guild.id}, guildName: ${guild.name}`);
			throw new Error('failed to setup on downed discord server');
		}
		
		const permissionOverwritesList: OverwriteResolvable[] = [{
			id: authorizedRole.id,
			allow: getRequiredChannelPermissionsForDegenAuthorized(),
		}, {
			id: apiKeys.DISCORD_BOT_ID,
			allow: getRequiredChannelPermissionsForDegenAuthorized(),
		}, {
			id: guild.roles.everyone.id,
			deny: [Permissions.FLAGS.VIEW_CHANNEL],
		}];
		
		const setupChannel: TextChannel | void = await guild.channels.create('degen-commands', {
			reason: 'Setting up DEGEN',
			type: ChannelTypes.GUILD_TEXT,
			permissionOverwrites: permissionOverwritesList,
		}).catch(Log.error);
		
		if (setupChannel == null) {
			throw new Error('failed to setup private channel');
		}
		
		const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordServerCollectionCollection: MongoCollection<DiscordServerCollection> = dbInstance.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
		const resultUpdate = await discordServerCollectionCollection.updateOne({
			serverId: guild.id,
		}, {
			$set: {
				privateChannelId: setupChannel.id,
			},
		});
		
		if (resultUpdate == null || resultUpdate.modifiedCount <= 0) {
			throw new Error('failed to add channelId to db');
		}
		
		Log.debug('degen-commands channel setup');
		return setupChannel;
	},
	
	async tryDMUser(_: GuildMember, __: string): Promise<boolean> {
		return false;
		// try {
		// 	await guildMember.send({ content: message });
		// 	return true;
		// } catch (e) {
		// 	Log.warn(`DM is turned off for ${guildMember.user.tag}`);
		// 	return false;
		// }
	},
	
	prepEmbedField: (field: string | null | undefined): string => {
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
		msg: MessageOptions | MessageOptionsSlash,
		isDmOn: boolean,
		guildMember: GuildMember,
		ctx?: CommandContext | undefined | null,
		channelExecution?: TextChannel | null,
	): Promise<boolean | Message | MessageSlash> => {
		if (isDmOn) {
			return await guildMember.send(msg as MessageOptions);
		} else if (ctx) {
			msg = msg as MessageOptionsSlash;
			msg.ephemeral = true;
			return await ctx.send(msg);
		} else if (channelExecution) {
			return await channelExecution.send(msg as MessageOptions);
		}
		throw new Error('Failed to send msg to user');
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
	
	isDMEnabledForUser: async (_: GuildMember, __: MongoCollection<DiscordUserCollection>): Promise<boolean> => {
		// TODO: lookup isPOAPDeliveryEnabled in ethWalletSettings
		return false;
		// await member.fetch();
		// const result: DiscordUserCollection | null = await dbUsersCollection.findOne({
		// 	userId: member.id.toString(),
		// });
		//
		// if (result == null) {
		// 	return false;
		// }
		//
		// return result.isDMEnabled;
	},

	addActiveDiscordServer: async (guild: Guild): Promise<void> => {
		Log.debug('attempting to add discord server to db');
		const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const discordServerCollection = await db.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
		await discordServerCollection.updateOne({
			serverId: guild.id.toString(),
		}, {
			$set: {
				serverId: guild.id.toString(),
				name: guild.name,
			},
		}, {
			upsert: true,
		});
		Log.info(`${constants.APP_NAME} active for: ${guild.id}, ${guild.name}`);
	},
};

export default ServiceUtils;
