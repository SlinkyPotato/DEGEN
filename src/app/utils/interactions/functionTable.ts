import { updatePOAPDAddress } from './../mongoDbOperations/updatePOAPDeliveryAddress';
import { deletUserAddressInteraction } from './../interactions/deleteUserAddressInteraction';
import { deleteUserAddress } from './../mongoDbOperations/deleteUserAddress';
import { v1WalletConnect } from '../v1WalletConnect';
import { sendLinkToWebsite } from '../sendLinkToWebsite';
import { changePOAPAddressInteraction } from '../interactions/changePOAPAddressInteraction';
import Log from '../Log';

export const functionTable = async (functionToCall: string, args:any, selectedItemDescription?:string): Promise<any> => {
	Log.debug(`FunctionTable ${functionToCall}`);
	const { user, dmChannel, discordUserDocument } = args;

	selectedItemDescription === undefined ? '' : selectedItemDescription;

	const connectedAddresses = args.discordUserDocument?.connectedAddresses ? args.discordUserDocument.connectedAddresses : null;
	if (functionToCall === 'walletConnect') {
		// const nickname = await chooseANickName(user, dmChannel, connectedAddresses);
		return await v1WalletConnect(user, dmChannel, connectedAddresses);
	} if (functionToCall === 'changePOAPAddress' && discordUserDocument && connectedAddresses) {
		return await changePOAPAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
	} if (functionToCall === 'updatePOAPAddress' && connectedAddresses && selectedItemDescription) {
		return await updatePOAPDAddress(user, selectedItemDescription);
	} if (functionToCall === 'deleteAddressInteraction' && connectedAddresses && discordUserDocument) {
		return await deletUserAddressInteraction(user, dmChannel, discordUserDocument, connectedAddresses);
	} if (functionToCall === 'deleteUserAddress' && selectedItemDescription) {
		return await deleteUserAddress(user, selectedItemDescription);
	} else {
		return await sendLinkToWebsite();
	}
};