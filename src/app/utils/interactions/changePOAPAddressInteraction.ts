import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import { sendMessageWithInteractions } from '../sendMessageWithInteraction';
import { ConnectedAddress } from '../../types/discord/ConnectedAddress';
import { MessageSelectOptionData } from 'discord.js';
import { DEGENInteraction } from '../../types/DEGENInteraction';
import Log from '../Log';

export const changePOAPAddressInteraction = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection, connectedAddresses: ConnectedAddress[]): Promise<DEGENInteraction> => {

	Log.debug('changePOAPAddressInteraction started');
	const menuItems: MessageSelectOptionData[] = connectedAddresses.map((address, i) => {
		return {
			label: `${address.nickname}`,
			description: `ChainId: ${address.chainId}, Address: ${address.address}`,
			value: i.toString(),
		};
	});


	const dEGENInteraction: DEGENInteraction = {
		prompt: 'Select the address you want to be live.',
		menuOptions: menuItems,
		functionToCall: 'updatePOAPAddress',
	};

	return sendMessageWithInteractions(dEGENInteraction, dmChannel, user, discordUserDocument);
};

// when the user hits changePOAPAddress, send them the menu interaction back