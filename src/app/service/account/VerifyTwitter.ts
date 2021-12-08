import { GuildMember } from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { Collection, Db, DeleteWriteOpResultObject } from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import Log from '../../utils/Log';
import { TwitterApi, UserV1 } from 'twitter-api-v2';
import ServiceUtils from '../../utils/ServiceUtils';
import { CommandContext } from 'slash-create';

export type VerifiedTwitter = {
	twitterUser: UserV1,
	twitterClientV1: TwitterApi
};

const VerifyTwitter = async (ctx: CommandContext, guildMember: GuildMember): Promise<VerifiedTwitter> => {
	Log.debug('verifying twitter account link');
	
	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, 'Hi! Let me check your twitter info');
	if (!isDmOn) {
		await ServiceUtils.sendOutErrorMessage(ctx, 'Account verification is temporarily turned off. Please reach out to support with any questions.');
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	
	Log.debug('looking for discord auth account');
	const nextAuthAccount: NextAuthAccountCollection = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: guildMember.user.id.toString(),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		Log.debug('next auth account not found');
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	Log.debug('found next auth discord from db, now looking for twitter account');
	const twitterCollection = await accountsCollection.findOne({
		providerId: 'twitter',
		userId: nextAuthAccount.userId,
	});
	
	if (twitterCollection == null || twitterCollection.accessToken == null) {
		Log.debug('twitter account not linked');
		await sendTwitterAuthenticationMessage(guildMember);
		return;
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
		});

		Log.debug('testing validity of twitter account');
		userCall = await userClient.currentUser(true);
	} catch (e) {
		Log.warn('invalid twitter auth found in db, verifyCredentials failed. Now removing from db...');
		await removeTwitterAccountLink(nextAuthAccount);
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	if (twitterId != userCall.id_str) {
		Log.debug('invalid twitter account, sending auth message');
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	Log.debug(`${guildMember.user.tag} has linked their twitter account, twitterId: ${twitterId}, sending message`);
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Authentication',
				description: 'Twitter account linked 👍',
				fields: [
					{ name: 'Display Name', value: `${userCall.screen_name}` },
					{ name: 'Description', value: `${ServiceUtils.prepEmbedField(userCall.description)}` },
					{ name: 'URL', value: `https://twitter.com/${userCall.screen_name}` },
				],
			},
		],
	});
	Log.debug('done verifying twitter account');
	return {
		twitterUser: userCall,
		twitterClientV1: userClient,
	};
};

const removeTwitterAccountLink = async (nextAuthAccount: NextAuthAccountCollection): Promise<any> => {
	Log.debug('removing twitter account link from db');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	const result: DeleteWriteOpResultObject = await accountsCollection.deleteOne({
		providerId: 'twitter',
		userId: nextAuthAccount.userId,
	});
	if (result.result.ok != 1) {
		Log.warn('failed to remove twitter account');
		throw new Error('failed to unlink twitter account');
	}
	Log.debug('twitter account unlinked and removed from db');
	return;
};

const sendTwitterAuthenticationMessage = async (guildMember: GuildMember): Promise<void> => {
	Log.info(`${guildMember.user.tag} is not twitter authorized, sending request to link`);
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Authentication',
				description: 'Please verify your twitter account by following the link below.',
				fields: [
					{ name: 'URL', value: `${apiKeys.twitterVerificationUrl}` },
				],
			},
		],
	});
};

export default VerifyTwitter;