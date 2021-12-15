import { Collection } from 'mongodb';

export interface POAPTwitterUnclaimedParticipants extends Collection {
	event: string,
	discordServerId: string,
	discordServerName: string,
	twitterUserId: string,
	twitterSpaceId: string,
	poapLink: string,
	expiresAt: string,
}