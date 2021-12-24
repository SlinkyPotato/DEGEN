import { Collection, ObjectId } from 'mongodb';

export interface POAPAdmin extends Collection {
	_id: ObjectId,
	objectType: string,
	discordObjectId: string,
	discordObjectName: string,
	discordServerId: string,
	discordServerName: string,
}