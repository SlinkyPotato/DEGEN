import { Collection } from 'mongodb';

export interface DiscordServerCollection extends Collection {
	id: string,
	name: string,
	isDEGENActive: boolean,
}