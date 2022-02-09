import {
	Guild,
	GuildChannel,
	MessageEmbedOptions,
	Permissions,
	Role,
	TextChannel,
} from 'discord.js';
import Log from '../../utils/Log';
import {
	Collection as MongoCollection,
	Db,
	UpdateWriteOpResult,
} from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import roleNames from '../constants/roleNames';
import { DiscordServerCollection } from '../../types/discord/DiscordServerCollection';
import HowToPOAP from '../help/HowToPOAP';
import ServiceUtils from '../../utils/ServiceUtils';
import apiKeys from '../constants/apiKeys';

const SetupDEGEN = async (guild: Guild): Promise<any> => {
	Log.debug('starting up setup');
	
	if (await checkIsDEGENSetup(guild)) {
		// DEGEN is setup
		return;
	}
	
	// DEGEN is not setup, proceeding with setup
	const authorizedDEGENRole: Role = await createAuthorizedDEGENRole(guild);
	await setupBotToAuthorizedRole(guild, authorizedDEGENRole);
	const commandChannel: TextChannel = await ServiceUtils.createPrivateChannelForExecution(guild, authorizedDEGENRole);
	await displayDEGENIntroduction(commandChannel, authorizedDEGENRole);
	
	// guild.roles.cache.forEach(role => {
	// 	Log.debug(`role: ${role.name}, position: ${role.position}`);
	// });
	//
	// return;
	
	// if (await checkDoesPOAPAdminsExist(guild.id)) {
	// 	return;
	// }
};
export default SetupDEGEN;

const displayDEGENIntroduction = async (channel: TextChannel, authorizedDegensRole: Role): Promise<void> => {
	await channel.send({ content: 'gm!' });
	await channel.send({
		content: 'I can help you get DEGEN set up for POAP distribution! This is a 3-step process. ' +
			'If you made it this far then **congrats**! You\'ve done the first step: Invite DEGEN. ' +
			'If you have any questions or want more information, the `/help poap` command displays the below 👇',
		embeds: [HowToPOAP().embeds[0] as MessageEmbedOptions],
	}).catch(Log.error);
	
	await channel.send({
		content: 'Now let\'s jump into step 2 - this is important. A few things happened, the role `@' + authorizedDegensRole.name + '` ' +
			'was created and it allows users to execute the following commands: \n - `/poap start`\n - `/poap end`\n - `/poap distribute`\n - `/poap mint`\n' +
			'These are powerful commands that let\'s DEGEN track participation in a specific voice channel to later distribute POAPs. ' +
			'We need to give DEGEN bit more juice for that to happen. When you are ready, please move the `@' + authorizedDegensRole.name + '` to the highest role position ' +
			'you feel most comfortable. \n ' +
			'👉' + constants.SETUP_HOW_TO_MOVE_DEGEN_ROLE,
	});
};

// const checkDoesPOAPAdminsExist = async (guildId: string): Promise<boolean> => {
// 	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
// 	const poapAdminDb: MongoCollection<POAPAdmin> = dbInstance.collection(constants.DB_COLLECTION_POAP_ADMINS);
// 	Log.debug('looking for authorized poap users and roles');
// 	const authorizedUsersAndRolesCursor: Cursor<POAPAdmin> = poapAdminDb.find({
// 		serverId: guildId,
// 	});
// 	return await authorizedUsersAndRolesCursor.count() > 0;
// };

// const quickCheckIsDEGENSetup = async (guildId: string): Promise<boolean> => {
// 	Log.debug('quickly checking if DEGEN is setup via the DB');
// 	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
// 	const discordServerCollectionCollection: MongoCollection<DiscordServerCollection> = dbInstance.collection(constants.DB_COLLECTION_DISCORD_SERVERS);
// 	const discordServerCollection: DiscordServerCollection | null = await discordServerCollectionCollection.findOne({
// 		serverId: guildId,
// 	});
// 	const isDEGENSetup = discordServerCollection ? discordServerCollection.isDEGENSetup : false;
// 	Log.debug(`isDEGENSetup: ${isDEGENSetup}`);
// 	return isDEGENSetup;
// };

const checkIsDEGENSetup = async (guild: Guild): Promise<boolean> => {
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordServerCollectionCollection: MongoCollection<DiscordServerCollection> = dbInstance.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
	const discordServerCollection: DiscordServerCollection | null = await discordServerCollectionCollection.findOne({
		serverId: guild.id,
	});
	
	if (discordServerCollection == null) {
		Log.debug(`discord server collection missing, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	if (discordServerCollection.roles == null) {
		Log.debug(`authorized degen role not found in db, serverId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	const degenAuthorizedRole: Role | null = await guild.roles.fetch(discordServerCollection.roles.authorizedDegenId);
	if (degenAuthorizedRole == null) {
		Log.debug(`authorized degen role not found in guild, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	if (!degenAuthorizedRole.permissions.has(getRequiredChannelPermissionsForDegenAuthorized())) {
		Log.debug(`degen authorized role is missing required permissions, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	Log.info('authorized degen role exists and has valid permissions');
	
	if (discordServerCollection.privateChannelId == null) {
		Log.debug(`private channel ID missing from db, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	const privateChannel: GuildChannel | null = await guild.channels.fetch(discordServerCollection.privateChannelId);
	if (privateChannel == null) {
		Log.debug(`private channel not found in guild, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	if (!privateChannel.isText()) {
		Log.debug('channel found is not a text channel');
		return false;
	}
	
	if (!degenAuthorizedRole.permissionsIn(privateChannel)) {
		Log.debug('channel found does not have required permissions');
		return false;
	}
	
	Log.debug('degen is setup, now updating db');
	
	const result = await discordServerCollectionCollection.updateOne(discordServerCollection, {
		isDEGENSetup: true,
	});
	
	if (result == null || result.result.n != 1) {
		throw new Error('failed to update isDEGENSetup in db');
	}
	
	Log.debug('attempting to send message in private channel');
	await privateChannel.send({ content: 'DEGEN is already setup! Please run `/poap config modify` to add users to `authorized degen` role.' });
	
	Log.info('degen setup update complete in db');
	return true;
};

/**
 * List of required permissions for the degen authorized role
 */
export const getRequiredChannelPermissionsForDegenAuthorized = (): Permissions => {
	return new Permissions([Permissions.FLAGS.VIEW_CHANNEL,
		Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
		Permissions.FLAGS.SEND_MESSAGES,
		Permissions.FLAGS.ATTACH_FILES,
		Permissions.FLAGS.CREATE_PRIVATE_THREADS,
		Permissions.FLAGS.MANAGE_MESSAGES,
		Permissions.FLAGS.MANAGE_THREADS,
		Permissions.FLAGS.USE_PRIVATE_THREADS,
		Permissions.FLAGS.USE_APPLICATION_COMMANDS]);
};

const createAuthorizedDEGENRole = async (guild: Guild): Promise<Role> => {
	Log.debug('attempting to create authorized degen');
	const role: Role = await guild.roles.create({
		name: roleNames.AUTHORIZED_DEGENS,
		color: 'DARK_GREEN',
		permissions: getRequiredChannelPermissionsForDegenAuthorized(),
		hoist: true,
	});
	
	Log.debug(`role created, roleID: ${role.id}`);
	
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordServerCollectionCollection: MongoCollection<DiscordServerCollection> = dbInstance.collection(constants.DB_COLLECTION_DISCORD_SERVERS);
	const resultUpdate: UpdateWriteOpResult = await discordServerCollectionCollection.updateOne({
		serverId: guild.id,
	}, {
		$set: {
			roles: {
				authorizedDegenId: role.id,
			},
		},
	});
	
	if (resultUpdate == null || resultUpdate.modifiedCount <= 0) {
		throw new Error('failed to add role ID to db');
	}
	
	Log.debug(`authorized degen role create: roleId: ${role.id}, name: ${role.name}`);
	return role;
};

const setupBotToAuthorizedRole = async (guild: Guild, authorizedDEGENRole: Role): Promise<void> => {
	Log.debug('attempting to setup bot under authorized role');
	await (await guild.members.fetch(apiKeys.DISCORD_BOT_ID)).roles.add(authorizedDEGENRole);
	Log.debug('finished setting up bot role');
};
