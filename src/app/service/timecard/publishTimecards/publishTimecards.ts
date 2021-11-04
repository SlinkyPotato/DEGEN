import { MessageEmbedOptions } from 'discord.js';
import { Timecard } from '../../../types/timecard.ts/Timecard';
import dayjs from 'dayjs';

export const generateEmbedMessage = (timecard:Timecard): MessageEmbedOptions => {

	const endTime = dayjs(timecard.endTime).format();
	const startTime = dayjs(timecard.startTime).format();
   
	return {
		color: 1998388,
		title: timecard.description,
		fields: [
			{ name: 'Start Time', value: startTime, inline: false },
			{ name: 'Endtime', value: endTime, inline: false },
			{ name: 'Duration', value: timecard.duration.toString() + ' minutes', inline: false },
		],
	};
};
