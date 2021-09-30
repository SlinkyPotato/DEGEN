import PoapAPI from './PoapAPI';
import { EventsRequestType } from './types/EventsRequestType';
import { EventsResponseType } from './types/EventsResponseType';

const EventsAPI = {
	scheduleEvent: async (request: EventsRequestType): Promise<EventsResponseType> => {
		return await PoapAPI.post('/events', request);
	},
};

export default EventsAPI;