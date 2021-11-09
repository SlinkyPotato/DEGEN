import { fqRescueCall } from './LaunchFirstQuest';
import { checkPOAPExpiration } from './FirstQuestPOAP';

export default async (): Promise<any> => {
	setInterval(async function(): Promise<void> { await fqRescueCall(); }, (1000 * 60 * 60 * 2));

	setInterval(async function(): Promise<void> { await checkPOAPExpiration(); }, (1000 * 60 * 60 * 6));
};

