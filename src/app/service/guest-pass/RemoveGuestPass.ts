import { Db, DeleteWriteOpResultObject } from 'mongodb';
import constants from '../constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import { GuildMember } from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export default async (guestUser: GuildMember): Promise<any> => {
	if (guestUser.user.bot) {
		return;
	}
	Log.info(`attempting to remove guest role from ${guestUser.user.tag}`);
	await removeGuestRoleFromUser(guestUser);
	await removeGuestUserFromDb(guestUser);
	return guestUser.send({ content: `Hi <@${guestUser.user.id}>, your guest pass has expired. Let us know at Bankless DAO if you have any questions!` }).catch(e => LogUtils.logError('failed to send message to expired guest', e));
};

export const removeGuestUserFromDb = async (guestUser: GuildMember): Promise<any> => {
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const dbGuestUsers = db.collection(constants.DB_COLLECTION_GUEST_USERS);
	
	const dbUpdateResult: DeleteWriteOpResultObject = await dbGuestUsers.deleteOne({ _id: guestUser.id });
	if (dbUpdateResult == null) {
		Log.error('Failed to delete guestUser');
		return;
	}
	Log.info(`${guestUser.user.tag} removed from db`);
};

export const removeGuestRoleFromUser = async (guestUser: GuildMember): Promise<void> => {
	const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
	await guestUser.roles.remove(guestRole);
	Log.info(`${guestUser.user.tag} removed from guest role`);
};
