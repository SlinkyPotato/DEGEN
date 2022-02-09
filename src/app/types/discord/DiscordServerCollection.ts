import {
	Collection,
	ObjectId,
} from 'mongodb';

export interface DiscordServerCollection extends Collection {
	_id: ObjectId
	serverId: string,
	name: string,
	isDEGENSetup?: boolean,
	privateChannelId?: string
	roles?: {
		authorizedDegenId: string,
	}
}
