import { BountyReward } from './BountyReward';

export type BountyCreateNew = {
	customerId: string,
	title: string,
	summary?: string,
	criteria?: string,
	reward: BountyReward,
	dueAt?: Date,
	copies: number,
};