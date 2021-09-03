import { VoiceState } from 'discord.js';
import addUserForEvent from './poap/AddUserForEvent';
import poapEvents from '../service/constants/poapEvents';
import channelIds from '../service/constants/channelIds';
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
	execute(oldState: VoiceState, newState: VoiceState): void {
		try {
			addUserForEvent(oldState, newState, { id: channelIds.COMMUNITY_CALLS_STAGE, value: poapEvents.COMMUNITY_CALL }).catch(console.error);
			addUserForEvent(oldState, newState, { id: channelIds.DEV_WORKROOM, value: poapEvents.DEV_GUILD }).catch(console.error);
			addUserForEvent(oldState, newState, { id: channelIds.WRITERS_ROOM, value: poapEvents.WRITERS_GUILD }).catch(console.error);
		} catch (e) {
			console.error(e);
		}
		return;
	}
}
