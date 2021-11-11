import { Collection, ObjectId } from 'mongodb';

export interface CustomerCollection extends Collection {
	_id: ObjectId,
    customerId: string,
    bountyChannel: string,
    name: string
}