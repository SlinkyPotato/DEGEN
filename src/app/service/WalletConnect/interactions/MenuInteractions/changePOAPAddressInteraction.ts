import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../../../types/discord/DiscordUserCollection';
import { MessageSelectOptionData } from 'discord.js';
import { DEGENMenuInteraction } from '../../../../types/interactions/DEGENMenuInteraction';
import Log from '../../../../utils/Log';
import { sendMenuInteraction } from '../../../../utils/interactionBuilders/sendMenuInteraction';

export const changePOAPAddressInteraction = (user: User, dmChannel:DMChannel, discordUserDocument: DiscordUserCollection): Promise<DEGENMenuInteraction> => {
	Log.debug('changePOAPAddressInteraction started');
	const { connectedAddresses } = discordUserDocument;
	const menuItems: MessageSelectOptionData[] = connectedAddresses.map((address, i) => {
		return {
			label: 'Connected Address',
			description: `${address}`,
			value: i.toString(),
		};
	});
	const interaction: DEGENMenuInteraction = {
		prompt: 'Select the address you want to be live.',
		menuOptions: menuItems,
		functionToCall: 'updatePOAPAddress',
	};
	return sendMenuInteraction(interaction, dmChannel, user, discordUserDocument);
};