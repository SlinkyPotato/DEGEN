import { EventsRequestType } from './types/poap-events/EventsRequestType';
import { EventsResponseType } from './types/poap-events/EventsResponseType';
import FormData from 'form-data';
import axios, { AxiosRequestConfig } from 'axios';
import Log, { LogUtils } from '../utils/Log';
import { GuildMember } from 'discord.js';

const EventsAPI = {
	scheduleEvent: async (request: EventsRequestType, guildMember?: GuildMember): Promise<EventsResponseType> => {
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
		try {
			Log.debug('sending poap formData request', {
				indexMeta: true,
				meta: {
					requestType: 'poap',
					name: `${request.name}`,
					description: `${request.description}`,
					city: `${request.city}`,
					country: `${request.country}`,
					start_date: `${request.start_date}`,
					end_date: `${request.end_date}`,
					expiry_date: `${request.expiry_date}`,
					year: `${request.year}`,
					event_url: `${request.event_url}`,
					virtual_event: `${request.virtual_event}`,
					secret_code: `${request.secret_code}`,
					event_template_id: `${request.event_template_id}`,
					email: `${request.email}`,
					requested_codes: `${request.requested_codes}`,
					imagePath: `${request.image.config.url}`,
				},
			});
			const response = await axios.post('https://api.poap.xyz/events', formData, config);
			Log.info('poap schedule response', {
				indexMeta: true,
				meta: {
					data: response.data,
				},
			});
			return response.data;
		} catch (e) {
			LogUtils.logError('failed to send poap event to POAP BackOffice', e);
			Log.debug('poap response', {
				indexMeta: true,
				meta: {
					error: e.toJSON,
					responseHeaders: e.response.headers,
					responseStatus: e.response.status,
					responseData: e.response.data,
				},
			});
			if (e.response.status == '400') {
				await guildMember.send({
					content: `Hmmm 🤔, this is what I found: ${e.response.data.message}`,
				});
			}
			throw new Error();
		}
	},
};

export default EventsAPI;