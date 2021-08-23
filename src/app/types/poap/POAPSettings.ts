import { Collection, ObjectId } from 'mongodb';

export interface POAPSettings extends Collection {
	_id: ObjectId,
	occasion: string,
	isActive: boolean,
	startTime: string,
	endTime: string,
	poapManagerId: string,
	poapManagerTag: string,
}