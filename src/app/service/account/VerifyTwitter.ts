import {
	GuildMember,
	MessageOptions,
} from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import {
	Collection,
	Db,
} from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import Log from '../../utils/Log';
import { TwitterApi, UserV1 } from 'twitter-api-v2';
import {
	CommandContext,
	MessageOptions as MessageOptionsSlash,
} from 'slash-create';
import { TwitterApiTokens } from 'twitter-api-v2/dist/types/client.types';
import { unlinkTwitterAccount } from './UnlinkAccount';
import { generateTwitterEmbedItem } from './ListAccounts';
import { MessageEmbedOptions as MessageEmbedOptionsSlash } from 'slash-create/lib/structures/message';

export type VerifiedTwitter = {
	twitterUser: UserV1,
	twitterClientV1: TwitterApi
};

const VerifyTwitter = async (ctx: CommandContext, guildMember: GuildMember, sendConfirmationMsg: boolean): Promise<VerifiedTwitter | undefined> => {
	Log.debug('starting to verify twitter account link');
		
	// important
	await ctx.defer(true);
	
	const verifiedTwitter: VerifiedTwitter | null = await retrieveVerifiedTwitter(guildMember);
	
	if (verifiedTwitter == null) {
		await sendTwitterAuthenticationMessage(guildMember, ctx);
		return;
	}
	
	Log.debug(`${guildMember.user.tag} has linked their twitter account, twitterId: ${verifiedTwitter.twitterUser.id_str}, sending message`);
	
	if (sendConfirmationMsg) {
		const embedMsg: MessageEmbedOptionsSlash = generateTwitterEmbedItem(verifiedTwitter) as MessageEmbedOptionsSlash;
		await ctx.send({ embeds: [embedMsg], ephemeral: true });
	
	}
	
	Log.debug('done verifying twitter account');
	return verifiedTwitter;
};

export const retrieveVerifiedTwitter = async (guildMember: GuildMember): Promise<VerifiedTwitter | null> => {
	Log.debug('starting to retrieve twitter account');
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	
	Log.debug('looking for discord auth account');
	const nextAuthAccount: NextAuthAccountCollection | null = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: guildMember.user.id.toString(),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		Log.debug('next auth account not found');
		return null;
	}
	
	Log.debug('found next auth discord from db, now looking for twitter account');
	const twitterCollection = await accountsCollection.findOne({
		providerId: 'twitter',
		userId: nextAuthAccount.userId,
	});
	
	if (twitterCollection == null || twitterCollection.accessToken == null) {
		Log.debug('twitter account not found');
		return null;
	}
	
	const twitterAccessToken = twitterCollection.accessToken;
	const twitterAccessSecret = twitterCollection.accessSecret;
	const twitterId = twitterCollection.providerAccountId;
	Log.debug(`twitter account found, twitterId: ${twitterId}`);
	
	let userClient: TwitterApi;
	let userCall: UserV1;
	try {
		userClient = new TwitterApi({
			appKey: apiKeys.twitterAppToken,
			appSecret: apiKeys.twitterAppSecret,
			accessToken: twitterAccessToken,
			accessSecret: twitterAccessSecret,
		} as TwitterApiTokens);
		
		Log.debug('testing validity of twitter account');
		userCall = await userClient.currentUser(true);
	} catch (e) {
		Log.warn('invalid twitter auth found in db, verifyCredentials failed. Now removing from db...');
		await unlinkTwitterAccount(guildMember);
		return null;
	}
	
	if (twitterId != userCall.id_str) {
		Log.debug('invalid twitter account Id');
		await unlinkTwitterAccount(guildMember);
		return null;
	}
	
	Log.debug('found twitter account');
	return {
		twitterUser: userCall,
		twitterClientV1: userClient,
	};
};

const sendTwitterAuthenticationMessage = async (guildMember: GuildMember, ctx: CommandContext): Promise<void> => {
	Log.info(`${guildMember.user.tag} is not twitter authorized, sending request to link`);
	let msg: MessageOptions | MessageOptionsSlash = {
		embeds: [
			{
				title: 'Twitter Authentication',
				description: 'Please verify your twitter account by following the link below.',
				fields: [
					{ name: 'URL', value: `${apiKeys.twitterVerificationUrl}` },
				],
			},
		],
	};
	msg = msg as MessageOptionsSlash;
	msg.ephemeral = true;
	await ctx.send(msg).catch(Log.error);
};

export default VerifyTwitter;