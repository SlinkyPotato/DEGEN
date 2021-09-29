import { GuildMember } from 'discord.js';
import POAPUtils from '../../utils/POAPUtils';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';

const SchedulePOAP = async (guildMember: GuildMember, numberToMint: number): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	await POAPUtils.validateNumberToMint(guildMember, numberToMint);
	
	console.log(numberToMint);
	return;
};

export default SchedulePOAP;