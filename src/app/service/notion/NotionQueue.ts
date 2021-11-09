import PQueue from 'p-queue';
import Log from '../../utils/Log';

export const notionQueue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 3 });

notionQueue.on('active', () => {
	Log.debug(`Queue is active. Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('idle', () => {
	Log.debug(`Queue is idle.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('add', () => {
	Log.debug(`Task is added.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('next', () => {
	Log.debug(`Task is completed.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});