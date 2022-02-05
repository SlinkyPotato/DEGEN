import { MessageButtonStyle } from 'discord.js';

export interface DiscordButtons {
    label: string,
    style: MessageButtonStyle,
    function: string,
    successMessage: string,
    failureMessage: string,
}


/* functions will be -> 
    - v1WalletConenct => return string
    - add an address => return string
    - change live address = return string
    - remove an address = return string


    1 prompt message
    two buttons


*/

/* 
    might be better to say gm,
    > check for addresses
    > if addresses, display them
    > then send options...

    > add an address
    > remove an address
    > change live address

    if no addresses, 
    > ask user if they want to connect a wallet with QR code or frontend
*/

