import { SlashCommand, CommandContext, SlashCreator } from 'slash-create';
import client from '../../app';
import discordServerIds from '../../service/constants/discordServerIds';

export default class NotionFAQs extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'connect',
			description: 'Connect your wallet',
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
		console.log('~~~~~~~~~~~~~~~~~~~~~~/connect START~~~~~~~~~~~~~~~~~~~~~~~');

		try {
			const guild = await client.guilds.fetch(ctx.guildID);
			const guildMember = await guild.members.fetch(ctx.user.id);
			const publicReplyStr = 'Follow this link to verify your address: http://localhost:4200/connect';
			const dmReplyStr = `${ctx.user.mention} Sent you a DM with information on how to connect your wallet.`;
			ctx.send(dmReplyStr);
			return guildMember.send(publicReplyStr);
		} catch (e) {
			console.error(e);
		}
	}
}