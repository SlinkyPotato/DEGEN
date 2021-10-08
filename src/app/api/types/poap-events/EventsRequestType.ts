import { AxiosResponse } from 'axios';

export type EventsRequestType = {
	name: string,
	description: string,
	city?: string,
	country?: string,
	start_date: string,
	end_date: string,
	expiry_date: string,
	year: string,
	event_url?: string,
	virtual_event: boolean,
	image: AxiosResponse,
	secret_code: string,
	event_template_id: string,
	email: string,
	requested_codes: string,
};