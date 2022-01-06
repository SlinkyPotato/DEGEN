import {
	GuildMember,
} from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import constants from '../service/constants/constants';
import ValidationError from '../errors/ValidationError';
import { POAPAdmin } from '../types/poap/POAPAdmin';
import Log from './Log';

const POAPUtils = {
	
	async validateUserAccess(guildMember: GuildMember, db: Db): Promise<any> {
		Log.debug('validating poap access');
		const poapAdminsDb: Collection = await db.collection(constants.DB_COLLECTION_POAP_ADMINS);
		const userResult: POAPAdmin = await poapAdminsDb.findOne({
			objectType: 'USER',
			discordObjectId: guildMember.user.id,
			discordServerId: guildMember.guild.id,
		});
		if (userResult != null) {
			// user has access
			Log.debug('has poap access');
			return;
		}
		const rolesCursor: Cursor<POAPAdmin> = await poapAdminsDb.find({
			objectType: 'ROLE',
			discordServerId: guildMember.guild.id,
		});
		for await (const poapRole of rolesCursor) {
			if (guildMember.roles.cache.some(role => role.id === poapRole.discordObjectId)) {
				// role has access
				Log.debug('has poap access');
				return;
			}
		}
		throw new ValidationError('Only authorized users can use this command. Please reach out to an admin for configuration help.');
	},
	
};

export default POAPUtils;