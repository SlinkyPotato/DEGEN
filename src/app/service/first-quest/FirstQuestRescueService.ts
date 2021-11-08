import { fqRescueCall } from './LaunchFirstQuest';

export default async (): Promise<any> => {
	setInterval(async function(): Promise<void> { await fqRescueCall(); }, (1000 * 60 * 60 * 2));
};