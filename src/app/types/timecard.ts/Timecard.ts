import { Collection, ObjectId } from 'mongodb';

export interface Timecard extends Collection {
	_id: ObjectId,
	startTime: string,
	endTime: string,
    description: string,
    duration: number,
	discordUserId: string,
	discordServerId: string,
	isActive: boolean,
}