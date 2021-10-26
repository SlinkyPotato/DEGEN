import { CommandContext } from 'slash-create';
import { GuildMember } from 'discord.js';
import { TwitterApi } from 'twitter-api-v2';
import apiKeys from '../constants/apiKeys';

const VerifyTwitter = async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {
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
				description: 'Please verify your twitter by following the link below.',
				fields: [
					{ name: 'URL', value: `${authLink.url}` },
				],
			},
		],
	});
	
	// await ctx.send({
	// 	embeds: [
	// 		{
	// 			title: 'Twitter Info',
	// 			fields: [
	// 				{ name: 'ID', value: `${currentUser.id}` },
	// 				{ name: 'Handle', value: `${currentUser.screen_name}` },
	// 				{ name: 'Description', value: `${currentUser.description}` },
	// 			],
	// 		},
	// 	],
	// });
	// Log.debug(currentUser);
	return;
};

export default VerifyTwitter;