import { GuildMember } from 'discord.js';
import { TwitterApi } from 'twitter-api-v2';
import apiKeys from '../constants/apiKeys';

const VerifyTwitter = async (guildMember: GuildMember): Promise<any> => {
	const twitterClient = new TwitterApi({
		appKey: apiKeys.twitterAppToken,
		appSecret: apiKeys.twitterAppSecret,
	});
	
	const authLink = await twitterClient.generateAuthLink(apiKeys.twitterCallbackUrl);
	// const currentUser = await twitterClient.currentUser();
	
	await guildMember.send({
		embeds: [
			{
				title: 'Twitter Authentication',
				description: 'Please verify your twitter account by following the link below.',
				fields: [
					{ name: 'URL', value: `${authLink.url}` },
				],
			},
		],
	});
	
	return;
};

export default VerifyTwitter;