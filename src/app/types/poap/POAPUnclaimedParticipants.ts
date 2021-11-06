import { Collection } from 'mongodb';

export interface POAPUnclaimedParticipants extends Collection {
	event: string,
	discordUserId: string,
	discordUserTag: string,
	discordServerId: string,
	discordServerName: string,
	twitterUserId?: string,
	claimCode: string,
	poapLink: string,
	expiresAt: string,
}