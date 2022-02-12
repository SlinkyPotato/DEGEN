import {
	Collection,
	ObjectId,
} from 'mongodb';
import { ConnectedAddress } from './ConnectedAddress';

export interface DiscordUserCollection extends Collection {
	_id: ObjectId,
	userId: string,
	tag: string,
	reportedForPOAP: number,
	isPremium: boolean,
	connectedAddresses: ConnectedAddress[]
}
