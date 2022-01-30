import {
	Collection,
	ObjectId,
} from 'mongodb';

export interface DiscordUserCollection extends Collection {
	_id: ObjectId,
	userId: string,
	tag: string,
	reportedForPOAP: number,
	isPremium: boolean,
	walletSettings: {
		ETH:[{
			publicAddress: string[],
			isPOAPDeliveryEnabled: boolean,
		}],
		MATIC: [{
			publicAddress: string[],
			isPOAPDeliveryEnabled: boolean,
		}]

	} | null,
	]
	isDMEnabled: boolean,
}
