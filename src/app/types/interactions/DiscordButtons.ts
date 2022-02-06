import { MessageButtonStyle } from 'discord.js';

export interface DiscordButtons {
    label: string,
    style: MessageButtonStyle,
    function: string,
    successMessage: string,
    failureMessage: string,
}