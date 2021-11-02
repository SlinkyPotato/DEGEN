import { GuildMember } from 'discord.js';
import apiKeys from '../constants/apiKeys';

const VerifyTwitter = async (guildMember: GuildMember): Promise<any> => {

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
	return;
};

export default VerifyTwitter;