import { CommandContext } from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import ServiceUtils from '../../utils/ServiceUtils';
import { GuildMember } from 'discord.js';
import VerifyTwitter, { VerifiedTwitter } from './VerifyTwitter';
import constants from '../constants/constants';
import { Collection, Db, DeleteWriteOpResultObject } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';

const UnlinkAccount = async (ctx: CommandContext, guildMember: GuildMember, platform: string): Promise<any> => {
	Log.debug(`starting to unlink account ${platform}`);

	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, `Attempting to unlink account \`${platform}\``);
	
	if (isDmOn) {
		await ctx.send({ content: 'DM sent!', ephemeral: true });
	}
	
	try {
		if (platform == constants.PLATFORM_TYPE_TWITTER) {
			await unlinkTwitter(ctx, guildMember).catch(Log.error);
			await ctx.send({ content: 'Twitter account is unlinked.', ephemeral: true }).catch(Log.error);
		} else {
			Log.error('could not find platform');
		}
	} catch (e) {
		LogUtils.logError('failed to unlink twitter account', e);
		await ServiceUtils.sendOutErrorMessage(ctx).catch(Log.error);
	}
};

const unlinkTwitter = async (ctx: CommandContext, guildMember: GuildMember): Promise<void> => {
	const twitterUser: VerifiedTwitter | undefined = await VerifyTwitter(ctx, guildMember, true);
	if (twitterUser == null) {
		return;
	}
	
	

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	const result: DeleteWriteOpResultObject = await accountsCollection.deleteMany({
		providerId: 'twitter',
		providerAccountId: twitterUser.twitterUser.id_str,
	});
	if (result.result.ok != 1) {
		Log.warn('failed to remove twitter account');
		throw new Error('failed to unlink twitter account');
	}
};

export default UnlinkAccount;