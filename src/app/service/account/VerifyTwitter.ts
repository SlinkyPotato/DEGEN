import { GuildMember, Message } from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { Collection, Db, DeleteWriteOpResultObject } from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import Log from '../../utils/Log';
import { TwitterApi, UserV1 } from 'twitter-api-v2';
import ServiceUtils from '../../utils/ServiceUtils';

const VerifyTwitter = async (guildMember: GuildMember): Promise<{ twitterUser: UserV1, twitterClientV1: TwitterApi }> => {
	Log.debug('verifying twitter account link');
	await ServiceUtils.tryDMUser(guildMember, 'Hello! Let me check your twitter info...');
	
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
	
	Log.debug('twitter account found');
	const twitterAccessToken = twitterCollection.accessToken;
	const twitterAccessSecret = twitterCollection.accessSecret;
	const twitterId = twitterCollection.providerAccountId;
	
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
		userCall = await userClient.v1.verifyCredentials();
	} catch (e) {
		await removeTwitterAccountLink(nextAuthAccount);
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	if (twitterId != userCall.id_str) {
		Log.debug('invalid twitter account, sending auth message');
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	Log.debug(`${guildMember.user.tag} has linked their twitter account, sending message`);
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Authentication',
				description: 'Twitter account linked 👍',
				fields: [
					{ name: 'Display Name', value: `${userCall.screen_name}` },
					{ name: 'Description', value: `${userCall.description}` },
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

const sendTwitterAuthenticationMessage = (guildMember: GuildMember): Promise<Message> => {
	Log.info(`${guildMember.user.tag} is not twitter authorized, sending request to link`);
	return guildMember.send({
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