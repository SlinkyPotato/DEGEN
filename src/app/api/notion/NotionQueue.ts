import PQueue from 'p-queue';

export const notionQueue = new PQueue({concurrency: 1, interval: 1000, intervalCap: 3});

notionQueue.on('active', () => {
	console.debug(`Queue is active. Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('idle', () => {
	console.debug(`Queue is idle.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('add', () => {
	console.debug(`Task is added.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});

notionQueue.on('next', () => {
	console.debug(`Task is completed.  Size: ${notionQueue.size}  Pending: ${notionQueue.pending}`);
});