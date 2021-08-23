import { Collection, ObjectId } from 'mongodb';

export interface POAPParticipant extends Collection {
	_id: ObjectId,
	event: string,
	discordId: string,
	discordTag: string,
	startTime: string,
	endTime: string,
}