import {
	Collection,
	ObjectId,
} from 'mongodb';

export interface DiscordServerCollection extends Collection {
	_id: ObjectId
	serverId: string,
	name: string,
	isDEGENActive: boolean,
}
