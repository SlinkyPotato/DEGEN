import { sendMenuInteraction } from '../../../../utils/interactionBuilders/sendMenuInteraction';
import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../../../types/discord/DiscordUserCollection';
import { MessageSelectOptionData } from 'discord.js';
import { DEGENMenuInteraction } from '../../../../types/interactions/DEGENMenuInteraction';
import Log from '../../../../utils/Log';

export const deletUserAddressInteraction = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection): Promise<DEGENMenuInteraction> => {
	Log.debug('deleteUserAddressInteraction started.');
	const { connectedAddresses } = discordUserDocument;
	const menuItems: MessageSelectOptionData[] = connectedAddresses.map((address, i) => {
		return {
			label: 'Connected Address',
			description: `${address}`,
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