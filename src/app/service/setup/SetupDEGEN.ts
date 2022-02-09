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
	await displayDEGENInstructions(commandChannel, authorizedDEGENRole);
};
export default SetupDEGEN;

const displayDEGENInstructions = async (channel: TextChannel, authorizedDegensRole: Role): Promise<void> => {
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
			'you feel most comfortable. \n\n' +
			'👉 ' + constants.SETUP_HOW_TO_MOVE_DEGEN_ROLE + '\n\n',
	});
	
	await channel.send({
		content: 'Final step 3 - all that is left is to add users to the `@' + authorizedDegensRole.name + '` role. ' +
			'Feel free to add yourself with that role and anyone else. ' +
			'These special degens will have access to the POAP commands and can be seen at the top right 👉👆',
	});
};

const checkIsDEGENSetup = async (guild: Guild): Promise<boolean> => {
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const discordServerCollectionCollection: MongoCollection<DiscordServerCollection> = dbInstance.collection<DiscordServerCollection>(constants.DB_COLLECTION_DISCORD_SERVERS);
	const discordServerCollection: DiscordServerCollection | null = await discordServerCollectionCollection.findOne({
		serverId: guild.id,
	});
	
	Log.debug('checking if discord server collection exists in db');
	
	if (discordServerCollection == null) {
		Log.debug(`discord server collection missing, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	Log.debug('discord server collection exists in db');
	
	if (discordServerCollection.roles == null) {
		Log.debug(`authorized degen role not found in db, serverId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	Log.debug('discord roles found in db, now checking for specific Authorized degen role');
	
	const degenAuthorizedRole: Role | null | void | boolean = await guild.roles.fetch(discordServerCollection.roles.authorizedDegenId).catch(e => {
		Log.warn(e);
		return false;
	});
	
	if (degenAuthorizedRole == null || degenAuthorizedRole == false) {
		Log.debug(`authorized degen role not found in guild, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	Log.debug('found authorized degens role, now checking if role has correct permissions');
	
	if (!degenAuthorizedRole.permissions.has(getRequiredChannelPermissionsForDegenAuthorized())) {
		Log.debug(`degen authorized role is missing required permissions, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	Log.debug('authorized degens role has valid permissions, now checking if private commands channel exists in db');
	
	if (discordServerCollection.privateChannelId == null) {
		Log.debug(`private channel ID missing from db, guildId: ${guild.id}, name: ${guild.name}`);
		return false;
	}
	
	Log.debug('found private commands channle in db, now checking if it has valid permissions');
	
	const privateChannel: GuildChannel | boolean | void | null = await guild.channels.fetch(discordServerCollection.privateChannelId).catch(e => {
		Log.warn(e);
		return false;
	});
	
	if (privateChannel == null || privateChannel == false) {
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
		$set: {
			isDEGENSetup: true,
		},
	});
	
	if (result == null || result.result.n != 1) {
		throw new Error('failed to update isDEGENSetup in db');
	}
	
	Log.debug('attempting to send message in private channel');
	await privateChannel.send({ content: 'DEGEN is setup! Users can be added to `@Authorized degens` role.' });
	
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

