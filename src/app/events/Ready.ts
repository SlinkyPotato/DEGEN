import GuestPassService from '../service/guest-pass/GuestPassService';
import { Client, Guild } from 'discord.js';
import constants from '../service/constants/constants';
import discordServerIds from '../service/constants/discordServerIds';
import { connect } from '../utils/dbUtils';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import { restoreScoapEmbedAndVoteRecord } from '../service/scoap-squad/ScoapDatabase';
import Log, { LogUtils } from '../utils/Log';
import POAPService from '../service/poap/POAPService';

export default class implements DiscordEvent {
	name = 'ready';
	once = true;

	async execute(client: Client): Promise<any> {
		try {
			Log.info('The Sun will never set on the DAO. Neither will I. DEGEN & Serendipity are ready for service.');
			
			client.user.setActivity(process.env.DISCORD_BOT_ACTIVITY);
			client.guilds.cache.forEach((guild: Guild) => {
				Log.info(`DEGEN active for: ${guild.id}, ${guild.name}`);
			});
			await connect(constants.DB_NAME_DEGEN);

			if (client.guilds.cache.some((guild) => guild.id == discordServerIds.banklessDAO || guild.id == discordServerIds.discordBotGarage)) {
				await connect(constants.DB_NAME_BOUNTY_BOARD);
				await GuestPassService(client).catch(Log.error);
				await restoreScoapEmbedAndVoteRecord().catch(Log.error);
			}
			
			await connect(constants.DB_NAME_DEGEN);
			await POAPService.run(client).catch(Log.error);
			
			Log.info('DEGEN is ready!');
		} catch (e) {
			LogUtils.logError('Error processing event ready', e);
		}
	}
}