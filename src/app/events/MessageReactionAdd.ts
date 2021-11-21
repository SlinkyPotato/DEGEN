import { MessageReaction, PartialUser, User } from 'discord.js';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import messageReactionAddBounty from './bounty/MessageReactionAddBounty';
import ServiceUtils from '../utils/ServiceUtils';
import Log, { LogUtils } from '../utils/Log';
import ValidationError from '../errors/ValidationError';
import MongoDbUtils from '../utils/MongoDbUtils';
import { Db } from 'mongodb';
import constants from '../service/constants/constants';
import { CustomerCollection } from '../types/bounty/CustomerCollection'


export default class implements DiscordEvent {
	name = 'messageReactionAdd';
	once = false;
	
	async execute(reaction: MessageReaction, user: User | PartialUser): Promise<any> {
		try {
			// When a reaction is received, check if the structure is partial
			if (reaction.partial) {
				Log.info('Pulling full reaction from partial')
				await reaction.fetch();
			}

			if (user.partial) {
				Log.info('Pulling full user from partial')
				try {
					await user.fetch();
				} catch (error) {
					LogUtils.logError('failed to pull user partial', error);
					return;
				}
			}

			if (user.bot) {
				Log.info('Bot detected.')
				return;
			}

			const db: Db = await MongoDbUtils.connect(constants.DB_NAME_BOUNTY_BOARD);
			const dbAdmin = db.collection(constants.DB_COLLECTION_CUSTOMERS);
		
			const dbCustomerResult: CustomerCollection = await dbAdmin.findOne({
				customerId: reaction.message.guild.id
			});

			if (dbCustomerResult.customerId === reaction.message.guild.id) {
				await messageReactionAddBounty(reaction, user as User).catch(e => LogUtils.logError('failed to react to bounty', e));
			} else {
				Log.error(`Attempted 'MessageReactionAdd' on server that isn't allowlisted.`)
				throw new ValidationError(`Looks like the Bounty Board team hasn't allowlisted your server for reactions. Please reach out to your favorite Bounty Board representative! In the meantime, try using the slash commands. Begin by typing '/bounty'`)
			}
		} catch (e) {
			LogUtils.logError('failed to process event messageReactionAdd', e);
		}
	}
}
