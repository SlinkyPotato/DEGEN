import { GuildMember } from 'discord.js';
import { Collection, Cursor, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/db';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPParticipant } from '../../types/poap/POAPParticipant';

export default async (guildMember: GuildMember, event: string): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);

	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne({
		event: event,
		poapManagerId: guildMember.user.id,
	}, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError(`Sorry ${event} is not active. Please try /poap start.`);
	}
	console.log(`event ${event} ended`);
	const currentDate = (new Date()).toISOString();
	const bufferFile = await getBufferFromParticipants(guildMember, db, event);
	await guildMember.send({
		content: `Hello! Let me send you a list of the participants for ${event} on \`${currentDate} UTC\``,
		files: [{ name: `${event}_participants.txt`, attachment: bufferFile }],
	});
	
	return dbInstance.close();
};

export const getBufferFromParticipants = async (guildMember: GuildMember, db: Db, event: string): Promise<Buffer> => {
	const poapParticipants: Collection = db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const resultCursor: Cursor<POAPParticipant> = await poapParticipants.find({
		event: event,
	});
	
	if ((await resultCursor.count()) === 0) {
		console.log(`no participants found for ${event}`);
		return Buffer.from('', 'utf-8');
	}
	
	let participants = '';
	await resultCursor.forEach((participant: POAPParticipant) => {
		participants += participant.discordTag + '\n';
	});
	
	return Buffer.from(participants, 'utf-8');
};