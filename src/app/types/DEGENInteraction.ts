import { MessageSelectOptionData } from 'discord.js';
import { DiscordButtons } from './discord/DiscordButtons';
export interface DEGENInteraction {
    prompt: string,
    buttons?: DiscordButtons[],
    menuOptions?: MessageSelectOptionData[],
    functionToCall?: string,
}