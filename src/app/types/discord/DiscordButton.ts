import { DMChannel, User } from "discord.js";

export interface DiscordButtonInteraction {
    label: string,
    style: string,
    v1WalletConnect(user:User, dmChannel:DMChannel, action:string): Promise<string>,
    
}

/* functions will be -> 
    - v1WalletConenct => return string
    - add an address => return string
    - change live address = return string
    - remove an address = return string
*/