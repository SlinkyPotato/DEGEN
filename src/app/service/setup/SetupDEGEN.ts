import {
	Guild,
	GuildMember,
	MessageEmbedOptions,
	Permissions,
	TextChannel,
} from 'discord.js';
import Log from '../../utils/Log';
import { ChannelTypes } from 'discord.js/typings/enums';
import ServiceUtils from '../../utils/ServiceUtils';
import apiKeys from '../constants/apiKeys';
import HowToPOAP from '../help/HowToPOAP';
import {
	Collection as MongoCollection,
	Cursor,
	Db,
} from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { POAPAdmin } from '../../types/poap/POAPAdmin';

const SetupDEGEN = async (guild: Guild): Promise<any> => {
	Log.debug('starting up setup');
	
	if (!guild.available) {
		Log.warn(`guild outage for, guildId: ${guild.id}, guildName: ${guild.name}`);
		throw new Error('failed to setup on downed discord server');
	}
	
	const permissionOverwritesList = [];
	
	Log.debug('starting to check for members with discord server permissions');
	await (await guild.members.fetch()).forEach((member: GuildMember) => {
		if ((ServiceUtils.isDiscordAdmin(member) || ServiceUtils.isDiscordServerManager(member))) {
			permissionOverwritesList.push({
				id: member.id,
				allow: [Permissions.FLAGS.VIEW_CHANNEL],
			});
		}
	});
	Log.debug('finished adding members with discord server permission');
	
	permissionOverwritesList.push({
		id: apiKeys.DISCORD_BOT_ID,
		allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
	});
	
	permissionOverwritesList.push({
		id: guild.roles.everyone.id,
		deny: [Permissions.FLAGS.VIEW_CHANNEL],
	});
	
	const setupChannel: TextChannel | void = await guild.channels.create('DEGEN setup', {
		reason: 'Setting up DEGEN',
		type: ChannelTypes.GUILD_TEXT,
		permissionOverwrites: permissionOverwritesList,
	}).catch(Log.error);
	
	if (setupChannel == null) {
		throw new Error('failed to setup private channel');
	}
	
	Log.debug('private channel created for degen setup');
	
	if (await checkDoesPOAPAdminsExist(guild.id)) {
		await setupChannel.send('POAP admins are already setup! The command `/poap config list` can show a list of all authorized users and roles for DEGEN. If all looks good, this channel can be deleted.');
		return;
	}
	
	await displayDEGENIntroduction(setupChannel);
};
export default SetupDEGEN;

const displayDEGENIntroduction = async (channel: TextChannel): Promise<void> => {
	await channel.send({ content: 'gm!' });
	await channel.send({
		content: 'I can help you get DEGEN set up for POAP distribution! This is a 2-step process. ' +
			'If you made it this far then **congrats**, you\'ve done the first step: *Invite DEGEN*! ' +
			'If you have any questions or want more information, the `/help poap` command displays the below 👇',
		embeds: [HowToPOAP().embeds[0] as MessageEmbedOptions],
	}).catch(Log.error);
	
	await channel.send({ content: 'Now let\'s jump into step 2, which roles or users should have access to POAP commands? Please execute `/poap config modify`.' });
};

const checkDoesPOAPAdminsExist = async (guildId: string): Promise<boolean> => {
	const dbInstance: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const poapAdminDb: MongoCollection<POAPAdmin> = dbInstance.collection(constants.DB_COLLECTION_POAP_ADMINS);
	Log.debug('looking for authorized poap users and roles');
	const authorizedUsersAndRolesCursor: Cursor<POAPAdmin> = poapAdminDb.find({
		discordServerId: guildId,
	});
	return await authorizedUsersAndRolesCursor.count() > 0;
};
