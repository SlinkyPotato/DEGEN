import { User } from 'discord.js';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';

export const createConnectedAddressEmbed = (user: User, discordUserDocument: DiscordUserCollection):any => {
	const connectedAddresses: string[] = discordUserDocument.connectedAddresses;
	const POAPAddress: string = connectedAddresses[0];
	const connectedAddressFields: {name: string, value: string, inline: boolean}[] = connectedAddresses.map(address => {
        
		return {
			name: 'Connected Address',
			value: `${address}`,
			inline: false,
		};
	});
    
	return {
		title: `${user.tag}`,
		description: `POAP Delivery Address: ${POAPAddress}`,
		fields: connectedAddressFields,
		footer: {
			text: 'Brought to you by DEGEN',
		},
	};
};