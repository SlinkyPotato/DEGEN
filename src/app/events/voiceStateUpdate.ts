import { VoiceState } from 'discord.js';
import addUserForEvent from './poap/addUserForEvent';
import poapEvents from '../service/constants/poapEvents';
import channelIds from '../service/constants/channelIds';

/**
 * voiceStateUpdate
 * Emitted whenever a member changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
 *
 */
module.exports = {
	name: 'voiceStateUpdate',
	once: false,

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
	},
};
