import { Db, DeleteWriteOpResultObject } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import { GuildMember } from 'discord.js';

export default async (guestUser: GuildMember): Promise<any> => {
	if (guestUser.user.bot) {
		return;
	}
	console.log(`attempting to remove guest role from ${guestUser.user.tag}`);
	await removeGuestRoleFromUser(guestUser);
	await removeGuestUserFromDb(guestUser);
	return guestUser.send({ content: `Hi <@${guestUser.user.id}>, your guest pass has expired. Let us know at Bankless DAO if you have any questions!` }).catch(console.error);
};

export const removeGuestUserFromDb = async (guestUser: GuildMember): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const dbGuestUsers = db.collection(constants.DB_COLLECTION_GUEST_USERS);
	
	const dbUpdateResult: DeleteWriteOpResultObject = await dbGuestUsers.deleteOne({ _id: guestUser.id });
	if (dbUpdateResult == null) {
		console.error('Failed to delete guestUser');
		return;
	}
	
	console.log(`${guestUser.user.tag} removed from db`);
};

export const removeGuestRoleFromUser = async (guestUser: GuildMember): Promise<void> => {
	const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
	await guestUser.roles.remove(guestRole);
	console.log(`${guestUser.user.tag} removed from guest role`);
};
