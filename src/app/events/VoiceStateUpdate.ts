import { VoiceState } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import { LogUtils } from '../utils/Log';
import HandleParticipantDuringEvent from './poap/HandleParticipantDuringEvent';

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
			await HandleParticipantDuringEvent(oldState, newState).catch(e => LogUtils.logError('failed to handle user in POAP event', e, oldState.guild.id));
		} catch (e) {
			LogUtils.logError('failed to process event voiceStateUpdate', e);
		}
	}
}
