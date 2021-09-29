import PoapAPI from './PoapAPI';
import { EventsRequestType } from './types/EventsRequestType';

const EventsAPI = {
	scheduleEvent: async (request: EventsRequestType): Promise<EventsRequestType> => {
		return await PoapAPI.post('/events', request);
	},
};

export default EventsAPI;