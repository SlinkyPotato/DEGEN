import { SlashCommand, CommandContext, CommandOptionType, SlashCreator } from 'slash-create';
import discordServerIds from '../../service/constants/discordServerIds';
import Log from '../../utils/Log';

export default class Tipping extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'tip',
			description: 'send $BANK token.',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
			options: [
				{
					name: 'recipient_wallet_address',
					type: CommandOptionType.STRING,
					description: 'The recipient wallet address.',
					required: true,
				},
				{
					name: 'token_quantity',
					type: CommandOptionType.INTEGER,
					description: 'Amount of $BANK you\'d like to send.',
					required: true,
				},
			],
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		// Ignores commands from bots
		if (ctx.user.bot) return;

		try {
			const recipient = ctx.options.recipient_wallet_address;
			const token_quantity = ctx.options.token_quantity;
			const dmReplyStr = `Sign your transaction here: http://localhost:4200/connect?recipient=${recipient}&quantity=${token_quantity}`;
			return ctx.send({ content: dmReplyStr, ephemeral: true });
		} catch (e) {
			Log.error(e);
		}
	}
}