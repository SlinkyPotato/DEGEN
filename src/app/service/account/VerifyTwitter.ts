import {
	GuildMember,
	MessageEmbedOptions,
} from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { Collection, Db, DeleteWriteOpResultObject } from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import Log from '../../utils/Log';
import { TwitterApi, UserV1 } from 'twitter-api-v2';
import ServiceUtils from '../../utils/ServiceUtils';
import {
	CommandContext,
	MessageEmbedOptions as MessageEmbedSlash,
} from 'slash-create';
import { TwitterApiTokens } from 'twitter-api-v2/dist/types/client.types';

export type VerifiedTwitter = {
	twitterUser: UserV1,
	twitterClientV1: TwitterApi
};

const VerifyTwitter = async (ctx: CommandContext, guildMember: GuildMember, sendConfirmationMsg: boolean): Promise<VerifiedTwitter | undefined> => {
	Log.debug('starting to verify twitter account link');
	
	const isDmOn: boolean = (sendConfirmationMsg) ? await ServiceUtils.tryDMUser(guildMember, 'Hi! Let me check your twitter info') : false;
	
	if (isDmOn) {
		await ctx.send({ content: 'DM sent!', ephemeral: true });
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	
	Log.debug('looking for discord auth account');
	const nextAuthAccount: NextAuthAccountCollection | null = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: guildMember.user.id.toString(),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		Log.debug('next auth account not found');
		await sendTwitterAuthenticationMessage(guildMember, ctx, isDmOn);
		return;
	}
	
	Log.debug('found next auth discord from db, now looking for twitter account');
	const twitterCollection = await accountsCollection.findOne({
		providerId: 'twitter',
		userId: nextAuthAccount.userId,
	});
	
	if (twitterCollection == null || twitterCollection.accessToken == null) {
		Log.debug('twitter account not linked');
		await sendTwitterAuthenticationMessage(guildMember, ctx, isDmOn);
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
		} as TwitterApiTokens);

		Log.debug('testing validity of twitter account');
		userCall = await userClient.currentUser(true);
	} catch (e) {
		Log.warn('invalid twitter auth found in db, verifyCredentials failed. Now removing from db...');
		await removeTwitterAccountLink(nextAuthAccount);
		await sendTwitterAuthenticationMessage(guildMember, ctx, isDmOn);
		return;
	}
	
	if (twitterId != userCall.id_str) {
		Log.debug('invalid twitter account, sending auth message');
		await sendTwitterAuthenticationMessage(guildMember, ctx, isDmOn);
		return;
	}
	
	Log.debug(`${guildMember.user.tag} has linked their twitter account, twitterId: ${twitterId}, sending message`);
	const verifiedEmbeds = {
		title: 'Twitter Authentication',
		description: 'Twitter account linked 👍',
		fields: [
			{ name: 'Display Name', value: `${userCall.screen_name}` },
			{ name: 'Description', value: `${ServiceUtils.prepEmbedField(userCall.description)}` },
			{ name: 'URL', value: `https://twitter.com/${userCall.screen_name}` },
		],
	};
	
	if (sendConfirmationMsg) {
		if (isDmOn) {
			await guildMember.send({ embeds: [verifiedEmbeds] });
		} else {
			await ctx.send({ embeds: [verifiedEmbeds], ephemeral: true });
		}
	}
	
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

const sendTwitterAuthenticationMessage = async (guildMember: GuildMember, ctx: CommandContext, isDmOn: boolean): Promise<void> => {
	Log.info(`${guildMember.user.tag} is not twitter authorized, sending request to link`);
	const embedsMsg: MessageEmbedOptions | MessageEmbedSlash = {
		title: 'Twitter Authentication',
		description: 'Please verify your twitter account by following the link below.',
		fields: [
			{ name: 'URL', value: `${apiKeys.twitterVerificationUrl}` },
		],
	};
	if (isDmOn) {
		await guildMember.send({ embeds: [ embedsMsg as MessageEmbedOptions ] }).catch(Log.error);
	} else {
		await ctx.send({ embeds: [embedsMsg as MessageEmbedSlash], ephemeral: true }).catch(Log.error);
	}
};

export default VerifyTwitter;