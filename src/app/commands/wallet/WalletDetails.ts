import { SlashCommand, CommandContext, SlashCreator } from 'slash-create';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { Db } from 'mongodb';
import discordServerIds from '../../service/constants/discordServerIds';
import constants from '../../service/constants/constants';
import Log from '../../utils/Log';

export default class WalletDetails extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'wallet',
			description: 'Lookup wallet details',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		// Ignores commands from bots
		if (ctx.user.bot) return;

		try {
			const walletAddress = await getWalletDetails(ctx.user.id);
			const username = ctx.user.mention;
			const dmReplyStr = walletAddress ? `Wallet connected to ${username} is ${walletAddress}. You can change these details with /connect.` : `Sorry, there's no wallet connected to ${username}. Use /connect to connect your wallet.`;
			return ctx.send({ content: dmReplyStr, ephemeral: true });
		} catch (e) {
			Log.error(e);
		}
	}
}

const getWalletDetails = async (userId: string) => {
	const degenDb: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const walletCollection = degenDb.collection(constants.DB_COLLECTION_DISCORD_USERS);
	
	Log.debug('looking for discord wallet details');
	const userResult = await walletCollection.findOne({
		userId: userId,
	});

	return userResult?.address || false;
};