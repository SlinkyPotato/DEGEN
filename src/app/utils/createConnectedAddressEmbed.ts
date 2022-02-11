import { User } from 'discord.js';
import { DiscordUserCollection } from '../types/discord/DiscordUserCollection';
import { getChain } from 'evm-chains';
import { ConnectedAddress } from '../types/discord/ConnectedAddress';

export const createConnectedAddressEmbed = (user: User, discordUserDocument: DiscordUserCollection):any => {
	const connectedAddresses: ConnectedAddress[] = discordUserDocument.connectedAddresses;
	const POAPAddress: ConnectedAddress = connectedAddresses[0];
	const connectedAddressFields: {name: string, value: string, inline: boolean}[] = connectedAddresses.map(address => {
        
		return {
			name: `${getChain(parseInt(address.chainId)).name}`,
			value: `Address: ${address.address} ChainId: ${address.chainId}`,
			inline: false,
		};
	});
    
	return {
		title: `${user.tag}'s`,
		description: `POAP Delivery Address: ${getChain(parseInt(POAPAddress.chainId)).name} ${POAPAddress.address}`,
		fields: connectedAddressFields,
		footer: {
			text: 'Brought to you by DEGEN',
		},
	};
};