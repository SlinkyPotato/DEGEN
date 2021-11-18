import { BountyReward } from './BountyReward';

export type BountyCreateNew = {
	customerId: string,
	customer_id?: string,
	title: string,
	summary?: string,
	criteria?: string,
	reward: BountyReward,
	dueAt?: Date,
	copies: number,
};