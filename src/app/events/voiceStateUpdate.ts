import { VoiceState } from 'discord.js';
import addUserForCommunityCall from './poap/addUserForCommunityCall';

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
		addUserForCommunityCall(oldState, newState).catch(console.error);
		return;
	},
};
