import { GuildMember } from 'discord.js';
import apiKeys from '../constants/apiKeys';
// import constants from '../constants/constants';
// import { Collection, Db } from 'mongodb';
// import dbConnect from '../../utils/dbUtils';

const VerifyTwitter = async (guildMember: GuildMember): Promise<any> => {

	// const db: Db = await dbConnect(constants.DB_NAME_NEXTAUTH);
	// const accountsCollection: Collection = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);

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