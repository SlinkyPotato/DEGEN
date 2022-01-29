import {
	POAPFileParticipant,
	TwitterPOAPFileParticipant,
} from '../../utils/POAPUtils';

export interface POAPDistributionResults {
	successfullySent: number,
	hasDMOff: number,
	claimSetUp: number,
	totalParticipants: number,
	failedToSendList: POAPFileParticipant[] | TwitterPOAPFileParticipant[],
	didNotSendList: POAPFileParticipant[] | TwitterPOAPFileParticipant[],
}