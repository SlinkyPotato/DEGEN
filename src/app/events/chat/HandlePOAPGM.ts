import {
	DMChannel,
	Message,
} from 'discord.js';
import Log, { LogUtils } from '../../utils/Log';
import { claimForDiscord } from '../../service/poap/ClaimPOAP';
import ServiceUtils from '../../utils/ServiceUtils';
import ValidationError from '../../errors/ValidationError';
import OptInPOAP from '../../service/poap/OptInPOAP';

const HandlePOAPGM = async (message: Message): Promise<void> => {
	const content: string = message.cleanContent;
	
	if (message.channel.type != 'DM') {
		return;
	}
	
	if (!content.match(/gm/gi)) {
		return;
	}
	Log.debug('found gm');
	
	const dmChannel: DMChannel = message.channel as DMChannel;
	
	try {
		await claimForDiscord(message.author.id.toString(), null, dmChannel);
		await OptInPOAP(message.author, dmChannel);
		
	} catch (e) {
		if (e instanceof ValidationError) {
			await ServiceUtils.sendOutErrorMessageForDM(dmChannel, e?.message);
		} else {
			await ServiceUtils.sendOutErrorMessageForDM(dmChannel);
		}
		LogUtils.logError('failed to claim poap in DM', e);
	}
};

export default HandlePOAPGM;