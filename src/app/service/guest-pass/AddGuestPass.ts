import client from '../../app';
import { Db } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../../constants';
import ServiceUtils from '../../utils/ServiceUtils';
import { GuildMember } from 'discord.js';

export const expiresInHours = 168;

export default async (guestUser: GuildMember): Promise<any> => {
	await addGuestUserToDb(guestUser);
	await addGuestRoleToUser(guestUser);
	notifyUserOfGuestExpiration(guestUser);
	return removeGuestRoleOnExpiration(guestUser);
};

export const addGuestUserToDb = async (guestUser: GuildMember): Promise<any> => {

	// DB Connected
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
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
		console.error('Failed to insert into DB');
		return;
	}

	await dbInstance.close();
	console.log(`/guest-pass end user ${guestUser.user.tag} inserted into guestUsers`);
};

export const addGuestRoleToUser = async (guestUser: GuildMember): Promise<void> => {
	const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
	await guestUser.roles.add(guestRole);
	console.log(`user ${guestUser.user.tag} given ${constants.DISCORD_ROLE_GUEST_PASS} role`);
};

export const notifyUserOfGuestExpiration = (guestUser: GuildMember): void =>{
	// Send out notification on timer
	client.setTimeout(async () => {
		await guestUser.send(`Hey <@${guestUser.id}>, your guest pass is set to expire in 1 day. Let us know if you have any questions!`);
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 60 * 24));

	client.setTimeout(async () => {
		await guestUser.send(`Hey <@${guestUser.id}>, your guest pass is set to expire in 15 minutes. Let us know if you have any questions!`);
	}, (expiresInHours * 1000 * 60 * 60) - (1000 * 60 * 15));

};

export const removeGuestRoleOnExpiration = (guestUser: GuildMember) => {
	// Handle removal of guest pass
	client.setTimeout(async () => {
		const timeoutDB: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
		const timeoutDBGuestUsers = timeoutDB.collection(constants.DB_COLLECTION_GUEST_USERS);
		const guestDBQuery = {
			_id: guestUser.id,
		};
		const dbDeleteResult = await timeoutDBGuestUsers.findOneAndDelete(guestDBQuery);
		if (dbDeleteResult == null) {
			console.error('Failed to remove from DB');
			return;
		}
		await dbInstance.close();
		console.log(`guest pass removed for ${guestUser.user.tag} in db`);

		// Remove guest pass role
		const guestRole = ServiceUtils.getGuestRole(guestUser.guild.roles);
		await guestUser.roles.remove(guestRole).catch(console.error);

		console.log(`/guest-pass end guest pass removed for ${guestUser.user.tag} in discord`);

		return guestUser.send(`Hi <@${guestUser.id}>, your guest pass has expired. Let us know at Bankless DAO if this was a mistake!`);
	}, expiresInHours * 1000 * 60 * 60);
};