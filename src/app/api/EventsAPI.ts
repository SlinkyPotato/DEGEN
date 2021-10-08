import { EventsRequestType } from './types/EventsRequestType';
import { EventsResponseType } from './types/EventsResponseType';
import FormData from 'form-data';
import axios, { AxiosRequestConfig } from 'axios';

const EventsAPI = {
	scheduleEvent: async (request: EventsRequestType): Promise<EventsResponseType> => {
		const formData: FormData = new FormData();
		formData.append('name', request.name);
		formData.append('description', request.description);
		formData.append('city', request.city);
		formData.append('country', request.country);
		formData.append('start_date', request.start_date);
		formData.append('end_date', request.end_date);
		formData.append('expiry_date', request.expiry_date);
		formData.append('year', request.year);
		formData.append('event_url', request.event_url);
		formData.append('virtual_event', request.virtual_event ? 'true' : 'false');
		formData.append('secret_code', request.secret_code);
		formData.append('event_template_id', request.event_template_id);
		formData.append('email', request.email);
		formData.append('requested_codes', request.requested_codes);
		

		formData.append('image', request.image.data, {
			contentType: 'image/png',
			filepath: request.image.config.url,
		});
		const config: AxiosRequestConfig = {
			method: 'post',
			url: 'https://api.poap.xyz/events',
			headers: {
				...formData.getHeaders(),
			},
			data : formData,
		};
		const response = await axios.post('https://api.poap.xyz/events', formData, config);
		console.log(response.data);
		return response.data;
	},
};

export default EventsAPI;