import { GuildMember, Message } from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/dbUtils';
import constants from '../constants/constants';
import { Collection, Db } from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import Log from '../../utils/Log';
import { TwitterApi, UserV1 } from 'twitter-api-v2';
import ServiceUtils from '../../utils/ServiceUtils';

const VerifyTwitter = async (guildMember: GuildMember): Promise<{ twitterUser: UserV1, twitterClientV1: TwitterApi }> => {
	await ServiceUtils.tryDMUser(guildMember);
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	const nextAuthAccount: NextAuthAccountCollection = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: guildMember.user.id.toString(),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	const twitterCollection = await accountsCollection.findOne({
		providerId: 'twitter',
		userId: nextAuthAccount.userId,
	});
	
	if (twitterCollection == null || twitterCollection.accessToken == null) {
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	const twitterAccessToken = twitterCollection.accessToken;
	const twitterAccessSecret = twitterCollection.accessSecret;
	const twitterId = twitterCollection.providerAccountId;
	
	const userClient: TwitterApi = new TwitterApi({
		appKey: apiKeys.twitterAppToken,
		appSecret: apiKeys.twitterAppSecret,
		accessToken: twitterAccessToken,
		accessSecret: twitterAccessSecret,
	});
	
	const userCall: UserV1 = await userClient.v1.verifyCredentials();
	
	if (twitterId != userCall.id_str) {
		await sendTwitterAuthenticationMessage(guildMember);
		return;
	}
	
	Log.info(`${guildMember.user.tag} has linked their twitter account`);
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
	return {
		twitterUser: userCall,
		twitterClientV1: userClient,
	};
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