import { Collection, ObjectId } from 'mongodb';

export interface POAPTwitterSettings extends Collection {
	_id: ObjectId,
	eventTitle: string,
	isActive: boolean,
	startTime: string,
	endTime: string,
	discordUserId: string,
	discordServerId: string
	twitterUserId: string,
	twitterSpaceId: string,
}