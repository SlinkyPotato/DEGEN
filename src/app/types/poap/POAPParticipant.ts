import { Collection, ObjectId } from 'mongodb';

export interface POAPParticipant extends Collection {
	_id: ObjectId,
	event: string,
	discordUserId: string,
	discordUserTag: string,
	startTime: string,
	endTime: string | null,
	voiceChannelId: string,
	discordServerId: string,
	durationInMinutes: number,
	minutesDeafenedInMeeting: number,
	timeDeafened: string,
	minutesAbsent: number,
	timeLeft: string,
	timeJoined: string,
	minutesListened: number,
	minutesAttended: number,
}
