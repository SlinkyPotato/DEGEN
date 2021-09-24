import { Collection, ObjectId } from 'mongodb';

export interface Allowlist extends Collection {
	_id: ObjectId,
	discordUserId: string,
	discordServerId: string,
}