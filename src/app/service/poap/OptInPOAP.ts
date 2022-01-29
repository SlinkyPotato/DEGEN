import {
	Collection,
	Db,
	InsertOneWriteOpResult,
} from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { DiscordUserCollection } from '../../types/discord/DiscordUserCollection';
import Log, { LogUtils } from '../../utils/Log';
import {
	DMChannel,
	Message,
	MessageActionRow,
	MessageButton,
	User,
} from 'discord.js';
import buttonIds from '../constants/buttonIds';

const OptInPOAP = async (user: User, dmChannel: DMChannel): Promise<void> => {
	Log.debug('starting opt-in check for user');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const userSettingsCol: Collection<DiscordUserCollection> = await db.collection(constants.DB_COLLECTION_DISCORD_USERS);
	
	Log.debug('looking for user in DB');
	const userSettings: DiscordUserCollection | null = await userSettingsCol.findOne({
		userId: user.id.toString(),
	});
	let isAllowedToGetDMs = false;
	await dmChannel.sendTyping();
	
	if (userSettings == null) {
		Log.debug('user settings not found');
		const result: InsertOneWriteOpResult<DiscordUserCollection> = await userSettingsCol.insertOne({
			userId: user.id.toString(),
			tag: user.tag,
			isDMEnabled: false,
		} as DiscordUserCollection);
		if (result == null || result.result.ok != 1) {
			throw new Error('failed to insert user settings');
		}
		
	} else {
		// handle eth wallet dm check
		isAllowedToGetDMs = userSettings.isDMEnabled;
	}
	
	if (!isAllowedToGetDMs) {
		// ask to opt in to eth delivery
		const row: MessageActionRow = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(buttonIds.POAP_OPT_IN_YES)
					.setLabel('Yes')
					.setStyle('PRIMARY'),
				new MessageButton()
					.setCustomId(buttonIds.POAP_OPT_IN_NO)
					.setLabel('No')
					.setStyle('SECONDARY'),
			);
		Log.debug('user has not opted in to DMs, now asking user for opt-in to get DM POAPs');
		const message: Message | void = await dmChannel.send({
			content: 'Would you like me to send you POAPs directly to you going forward?',
			components: [row],
		}).catch(e => {
			LogUtils.logError('failed to ask for opt-in', e);
			return;
		});
		
		if (message == null) {
			Log.debug('did not send opt-in message');
			return;
		}
		
		// 5 minute timeout
		try {
			await message.awaitMessageComponent({
				filter: args => (args.customId == buttonIds.POAP_OPT_IN_YES
					|| args.customId == buttonIds.POAP_OPT_IN_NO) && args.user.id == user.id.toString(),
				time: 300_000,
			}).then((interaction) => {
				if (interaction.customId == buttonIds.POAP_OPT_IN_YES) {
					isAllowedToGetDMs = true;
				} else {
					message.edit({ content: 'No problem!', components: [] });
				}
			}).catch(error => {
				try {
					message.edit({ content: 'Timeout reached, please reach out to us with any questions!', components: [] }).catch(e => {
						Log.warn(e);
						return;
					});
					Log.debug(error?.message);
				} catch (e) {
					LogUtils.logError('gm opt-in message edit occurred', e);
				}
			});
		} catch (e) {
			LogUtils.logError('gm opt-in time/error occurred', e);
			return;
		}
		
		if (isAllowedToGetDMs) {
			await userSettingsCol.updateOne({
				userId: user.id.toString(),
			}, {
				$set: {
					isDMEnabled: true,
				},
			});
			await message.edit({ content: 'Direct messages enabled! I will send you POAPs as soon as I get them, thank you!', components: [] });
			Log.debug('user settings updated');
		}
		Log.debug('user settings update skipped');
	} else {
		Log.debug(`user is opted in to dms, userId: ${user.id}`);
		await dmChannel.send({ content: 'I will send you POAPs as soon as I get them!' }).catch(e => {
			LogUtils.logError('failed to send opt-in confirmation', e);
		});
	}
};


export default OptInPOAP;