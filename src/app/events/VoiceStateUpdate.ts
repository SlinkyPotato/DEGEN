import { VoiceState } from 'discord.js';
import addUserForEvent from './poap/AddUserForEvent';
import { DiscordEvent } from '../types/discord/DiscordEvent';

/**
 * voiceStateUpdate
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 *
 */
export default class implements DiscordEvent {
	name = 'voiceStateUpdate';
	once = false;

	/**
	 * @param oldState The voice state before the update
	 * @param newState The voice state after the update
	 */
	async execute(oldState: VoiceState, newState: VoiceState): Promise<any> {
		try {
			await addUserForEvent(oldState, newState).catch(console.error);
		} catch (e) {
			console.error(e);
		}
	}
}
