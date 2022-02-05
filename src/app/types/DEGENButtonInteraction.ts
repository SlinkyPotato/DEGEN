import { DiscordButtons } from './discord/DiscordButtons';
export interface DEGENButtonInteraction {
    prompt: string,
    buttons: DiscordButtons[],
}