import {
	DMChannel,
	Message,
} from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import { claimForDiscord } from '../../service/poap/ClaimPOAP';
import ServiceUtils from '../../utils/ServiceUtils';
import ValidationError from '../../errors/ValidationError';
import { ConnectAddress } from '../../service/poap/ConnectAddress';

const HandlePOAPGM = async (message: Message): Promise<void> => {
	const content: string = message.cleanContent;
	
	if (message.channel.type != 'DM') {
		return;
	}
	
	if (!content.match(/^gm$/gi)) {
		return;
	}
	
	Log.debug(`found gm from ${message.author.tag}`);
	
	const dmChannel: DMChannel = message.channel as DMChannel;
	
	try {
		await claimForDiscord(message.author.id.toString(), null, dmChannel);
		await ConnectAddress(message.author, dmChannel);
		
	} catch (e) {
		if (e instanceof ValidationError) {
			await ServiceUtils.sendOutErrorMessageForDM(dmChannel, e?.message).catch(Log.error);
		} else {
			await ServiceUtils.sendOutErrorMessageForDM(dmChannel).catch(Log.error);
		}
		LogUtils.logError('failed to claim poap in DM', e);
	}
};

export default HandlePOAPGM;