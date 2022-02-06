import { updatePOAPDAddress } from './../mongoDbOperations/updatePOAPDeliveryAddress';
import { deletUserAddressInteraction } from './MenuInteractions/deleteUserAddressInteraction';
import { deleteUserAddress } from './../mongoDbOperations/deleteUserAddress';
import { v1WalletConnect } from '../v1WalletConnect';
import { sendLinkToWebsite } from '../sendLinkToWebsite';
import { changePOAPAddressInteraction } from './MenuInteractions/changePOAPAddressInteraction';
import Log, { LogUtils } from '../Log';
import { DMChannel, User } from 'discord.js';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import { error } from 'console';

export const functionTable = async (functionToCall: string, args:{user: User, dmChannel: DMChannel, discordUserDocument: DiscordUserCollection}, selectedItemDescription?:string): Promise<any> => {
	Log.debug(`FunctionTable ${functionToCall}`);
	const { user, dmChannel, discordUserDocument } = args;

	selectedItemDescription === undefined ? 'empty' : selectedItemDescription;

	const connectedAddresses = args.discordUserDocument?.connectedAddresses ? args.discordUserDocument.connectedAddresses : null;
	
	switch (functionToCall) {
	case 'walletConnect':
		// const nickname = await chooseANickName(user, dmChannel, connectedAddresses);
		return await v1WalletConnect(user, dmChannel, connectedAddresses);
	case 'changePOAPAddress':
		if (connectedAddresses) {
			return await changePOAPAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
		} break;
	case 'deleteAddressInteraction':
		if (connectedAddresses) {
			return await deletUserAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
		} break;
	case 'updatePOAPAddress':
		if (selectedItemDescription) {
			return await updatePOAPDAddress(user, selectedItemDescription);
		} break;
	case 'deleteUserAddress':
		if (selectedItemDescription) {
			return await deleteUserAddress(user, selectedItemDescription);
		} break;
	case 'sendLinkToWebsite':
		return await sendLinkToWebsite();
	default:
		LogUtils.logError('Function table did not find a case.', error);
		await dmChannel.send('Something appears to have gone wrong.');
	}
};