import { Collection, ObjectId } from 'mongodb';

export interface POAPParticipant extends Collection {
	_id: ObjectId,
	event: string,
	discordUserId: string,
	discordUserTag: string,
	startTime: string,
	endTime: string,
	voiceChannelId: string,
	discordServerId: string
}