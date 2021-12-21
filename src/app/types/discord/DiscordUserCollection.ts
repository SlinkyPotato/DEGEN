import { Collection } from 'mongodb';

export interface DiscordUserCollection extends Collection {
	id: string,
	tag: string,
	isDMEnabled: boolean,
	discordServersJoined: DiscordServer[],
}

type DiscordServer = {
	id: string,
}