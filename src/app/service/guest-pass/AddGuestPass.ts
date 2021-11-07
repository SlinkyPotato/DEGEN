import { Db } from 'mongodb';
import constants from '../constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import { GuildMember } from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export const expiresInHours = Number(process.env.DAO_GUEST_PASS_EXPIRATION_DAYS) * 24;

export default async (guestUser: GuildMember): Promise<any> => {
	if (guestUser.user.bot) {
		return;
	}
	Log.info(`attempting to add guest role to ${guestUser.user.tag}`);
	await addGuestUserToDb(guestUser);
	await addGuestRoleToUser(guestUser);
	notifyUserOfGuestExpiration(guestUser);
	removeGuestRoleOnExpiration(guestUser);
	return guestUser.send({
		content: 'You have been granted guest access at Bankless DAO! Guest passes last for '
			+ `${process.env.DAO_GUEST_PASS_EXPIRATION_DAYS}` + 'days and will expire afterwards. To renew your guest pass, '
			+ 'ask any Level 2 contributor to renew it, or post in #get-involved. In the future, we\'ll automate guest pass '
			+ 'renewal based on your activity in the DAO!',
	}).catch(e => LogUtils.logError('failed to send message to new guest', e));
};

export const addGuestUserToDb = async (guestUser: GuildMember): Promise<any> => {

	// DB Connected
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const dbGuestUsers = db.collection(constants.DB_COLLECTION_GUEST_USERS);
	const queryOptions = {
		upsert: true,
	};
	const currentTimestamp = Date.now();
	const guestDbUser = {
		_id: guestUser.id,
		tag: guestUser.user.tag,
		startTimestamp: currentTimestamp,
		expiresTimestamp: currentTimestamp + (expiresInHours * 1000 * 60 * 60),
	};

	// Find and update guest user in mongodb
	const dbUpdateResult = await dbGuestUsers.findOneAndReplace({
		_id: guestUser.id,
	}, guestDbUser, queryOptions);
	if (dbUpdateResult == null) {
		Log.error('Failed to insert into DB');
		return;
	}
	Log.info(`/guest-pass end user ${guestUser.user.tag} inserted into guestUsers`);
};

export const addGuestRoleToUser = async (guestUser: GuildMember): Promise<void> => {
	const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
	await guestUser.roles.add(guestRole);
	Log.info(`user ${guestUser.user.tag} given ${guestRole.name} role`);
};

export const notifyUserOfGuestExpiration = (guestUser: GuildMember): void =>{
	// Send out notification on timer
	setTimeout(async () => {
		await guestUser.send({ content: `Hey <@${guestUser.id}>, your guest pass is set to expire in 1 day. Let us know if you have any questions!` });
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 60 * 24));
	
	setTimeout(async () => {
		await guestUser.send({ content: `Hey <@${guestUser.id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!` });
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 15));

};

export const removeGuestRoleOnExpiration = (guestUser: GuildMember): void => {
	// Handle removal of guest pass
	setTimeout(async () => {
		const timeoutDB: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
		const timeoutDBGuestUsers = timeoutDB.collection(constants.DB_COLLECTION_GUEST_USERS);
		const guestDBQuery = {
			_id: guestUser.id,
		};
		const dbDeleteResult = await timeoutDBGuestUsers.findOneAndDelete(guestDBQuery);
		if (dbDeleteResult == null) {
			Log.info('Failed to remove from DB');
			return;
		}
		Log.info(`guest pass removed for ${guestUser.user.tag} in db`);

		// Remove guest pass role
		const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
		await guestUser.roles.remove(guestRole).catch(e => LogUtils.logError('failed to remove guest role from user', e));

		Log.info(`/guest-pass end; guest pass removed for ${guestUser.user.tag} in discord`);

		return guestUser.send({ content: `Hi <@${guestUser.id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!` });
	}, expiresInHours * 1000 * 60 * 60);
};