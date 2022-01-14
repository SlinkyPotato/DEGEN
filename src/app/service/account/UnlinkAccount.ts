import { CommandContext } from 'slash-create';
import Log from '../../utils/Log';

const UnlinkAccount = async (ctx: CommandContext, platform: string): Promise<any> => {
	Log.debug(`starting to unlink account ${platform}`);
	
	
};

export default UnlinkAccount;