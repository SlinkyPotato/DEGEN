import { Collection } from 'mongodb';

export interface POAPTwitterParticipants extends Collection {
	twitterUserId: string,
	twitterSpaceId: string,
	checkInDateISO: string
}