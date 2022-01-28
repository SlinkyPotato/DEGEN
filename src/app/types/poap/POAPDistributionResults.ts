import {
	POAPFileParticipant,
	TwitterPOAPFileParticipant,
} from '../../utils/POAPUtils';

export interface POAPDistributionResults {
	successfullySent: number,
	hasDMOff: number,
	claimSetUp: number,
	totalParticipants: number,
	failedToSend: number,
	didNotSendList: POAPFileParticipant[] | TwitterPOAPFileParticipant[],
}