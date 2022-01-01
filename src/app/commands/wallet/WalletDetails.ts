import { SlashCommand, CommandContext, SlashCreator } from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import discordServerIds from '../../service/constants/discordServerIds';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { Collection, Db } from 'mongodb';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import constants from '../../service/constants/constants';
import Log from '../../utils/Log';

export default class WalletDetails extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'wallet',
			description: 'Lookup wallet details',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
			throttling: {
				usages: 2,
				duration: 1,
			},
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		// Ignores commands from bots
		if (ctx.user.bot) return;
		console.log('~~~~~~~~~~~~~~~~~~~~~~/wallet START~~~~~~~~~~~~~~~~~~~~~~~');

		if (ctx.guildID == null) {
			await ctx.send({ content: 'Please try this command within a discord server.' });
			return;
		}

		try {
			// TODO: GET WALLET DETAILS
			const walletDetails = await getWalletDetails(ctx.user.id);
			console.log(`WALLET DETAILS`)
			console.log(walletDetails)
			const dmReplyStr = `Here's wallet details for ${ctx.user.mention}: {}. You can change these details with /connect.`;
			return ctx.send(dmReplyStr);
		} catch (e) {
			console.error(e);
		}
	}
}

const getWalletDetails = async (userId: string) => {
	console.log(`GETTING WALLET DETAILS FOR: ${userId}`);
	const degenDb: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const walletCollection = degenDb.collection(constants.DB_DISCORD_USER_ACCOUNTS);
	
	// Log.debug('looking for discord auth account');
	const userResult = await walletCollection.findOne({
		discordUserId: userId,
	});

	console.log(`RESULT----------------------------------`)
	console.log(userResult)

	// return nextAuthAccount;
	return "hello world"
}