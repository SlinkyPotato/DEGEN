import { MessageSelectOptionData } from 'discord.js';
export interface DEGENMenuInteraction {
    prompt: string,
    menuOptions: MessageSelectOptionData[],
    functionToCall: string,
}