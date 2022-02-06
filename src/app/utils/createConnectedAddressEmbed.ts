import { User } from 'discord.js';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';
import { getChain } from 'evm-chains';

export const createConnectedAddressEmbed = (user: User, discordUserDocument: DiscordUserCollection):any => {
    
	const connectedAddresses: {name: string, value: string, inline: boolean}[] = discordUserDocument.connectedAddresses.map(address => {
		
        
		return {
			name: `${getChain(parseInt(address.chainId)).name}`,
			value: `Address: ${address.address} ChainId: ${address.chainId}`,
			inline: false,
		};
	});
    
	return {
		title: `${user.tag}'s`,
		description: `POAP Delivery Address: ${discordUserDocument.POAPAddress}`,
		fields: connectedAddresses,
		footer: {
			text: 'Brought to you by DEGEN',
		},
	};
};