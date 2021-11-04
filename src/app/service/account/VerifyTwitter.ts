import { GuildMember, Message } from 'discord.js';
import apiKeys from '../constants/apiKeys';
import MongoDbUtils from '../../utils/dbUtils';
import constants from '../constants/constants';
import { Collection, Db, ObjectID } from 'mongodb';

const VerifyTwitter = async (guildMember: GuildMember): Promise<any> => {

	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	
	const nextAuthAccount:  = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: String(guildMember.user.id),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		return await sendTwitterAuthenticationMessage(guildMember);
	}
	
	
	return;
};

const sendTwitterAuthenticationMessage = (guildMember: GuildMember): Promise<Message> => {
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