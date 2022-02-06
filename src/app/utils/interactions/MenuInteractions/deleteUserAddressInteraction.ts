import { sendMenuInteraction } from '../../interactionBuilders/sendMenuInteraction';
import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../../types/discord/DiscordUserCollection';
import { ConnectedAddress } from '../../../types/discord/ConnectedAddress';
import { MessageSelectOptionData } from 'discord.js';
import { DEGENMenuInteraction } from '../../../types/interactions/DEGENMenuInteraction';
import Log from '../../Log';
import { getChain } from 'evm-chains';

export const deletUserAddressInteraction = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection, connectedAddresses: ConnectedAddress[]): Promise<DEGENMenuInteraction> => {
	Log.debug('deleteUserAddressInteraction started.');

	const menuItems: MessageSelectOptionData[] = connectedAddresses.map((address, i) => {
		return {
			label: `${getChain(parseInt(address.chainId)).name}`,
			description: `ChainId: ${address.chainId}, Address: ${address.address}`,
			value: i.toString(),
		};
	});


	const dEGENInteraction: DEGENMenuInteraction = {
		prompt: 'Select the address you want to delete.',
		menuOptions: menuItems,
		functionToCall: 'deleteUserAddress',
	};

	return sendMenuInteraction(dEGENInteraction, dmChannel, user, discordUserDocument);
};

// when the user hits changePOAPAddress, send them the menu interaction back