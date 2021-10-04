import PoapAPI from './PoapAPI';
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
		
		const imageFile = await axios.get('https://cdn.discordapp.com/attachments/851313193934651403/893266991425683476/Screen_Shot_2021-08-23_at_8.20.21_PM.png', {
			responseType: 'arraybuffer',
		});
		// console.log(imageFile.data);
		// const convImage = Buffer.from(imageFile.data, 'binary');
		formData.append('image', imageFile.data, {
			filename: 'Screen_Shot_2021-08-23_at_8.20.21_PM.png',
			contentType: 'image/png',
			filepath: 'https://cdn.discordapp.com/attachments/851313193934651403/893266991425683476/Screen_Shot_2021-08-23_at_8.20.21_PM.png',
		});
		console.log('form data prepared');
		const config: AxiosRequestConfig = {
			method: 'post',
			url: 'https://api.poap.xyz/events',
			headers: {
				...formData.getHeaders(),
			},
			data : formData,
		};
		// return await PoapAPI.post('https://api.poap.xyz/events', formData);
		// return await axios.post('https://api.poap.xyz/events', formData, {
		// 	headers: {
		// 		'accept': 'application/json',
		// 		'Accept-Language': 'en-US,en;q=0.8',
		// 		'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
		// 	},
		// });
		return await axios.post('https://api.poap.xyz/events', formData, config);
	},
};

export default EventsAPI;