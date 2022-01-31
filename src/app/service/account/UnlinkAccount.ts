import {
	ButtonStyle,
	CommandContext,
	ComponentContext,
	ComponentType,
} from 'slash-create';
import Log, { LogUtils } from '../../utils/Log';
import ServiceUtils from '../../utils/ServiceUtils';
import {
	GuildMember,
	Message,
	MessageActionRow,
	MessageButton,
	MessageOptions,
} from 'discord.js';
import {
	retrieveVerifiedTwitter,
	VerifiedTwitter,
} from './VerifyTwitter';
import constants from '../constants/constants';
import {
	Collection,
	Db,
	DeleteWriteOpResultObject,
	ObjectID,
} from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { NextAuthAccountCollection } from '../../types/nextauth/NextAuthAccountCollection';
import {
	Message as MessageSlash,
	MessageOptions as MessageOptionsSlash,
} from 'slash-create';
import buttonIds from '../constants/buttonIds';

const UnlinkAccount = async (ctx: CommandContext, guildMember: GuildMember, platform: string): Promise<any> => {
	Log.debug(`starting to unlink account ${platform}`);

	const isDmOn: boolean = await ServiceUtils.tryDMUser(guildMember, `Attempting to unlink account \`${platform}\`.`);
	
	// important
	await ctx.defer(true);
	
	if (isDmOn) {
		await ctx.send({ content: 'DM sent!', ephemeral: true });
	}
	
	try {
		if (platform == constants.PLATFORM_TYPE_TWITTER) {
			const twitterUser: VerifiedTwitter | null = await retrieveVerifiedTwitter(guildMember);
			if (twitterUser != null) {
				const shouldUnlink: boolean = await promptToUnlink(ctx, guildMember, isDmOn, twitterUser);
				if (shouldUnlink) {
					await unlinkTwitterAccount(guildMember).catch(e => { throw e; });
					await ServiceUtils.sendContextMessage({ content: 'Twitter account removed. To relink account try `/account link`.' }, isDmOn, guildMember, ctx).catch(Log.error);
					return;
				}
				await ServiceUtils.sendContextMessage({ content: 'Account not removed. To see list of accounts try `/account list`.' }, isDmOn, guildMember, ctx).catch(Log.error);
				return;
			}
			await ServiceUtils.sendContextMessage({ content: 'Twitter account not found!' }, isDmOn, guildMember, ctx);
		} else {
			Log.error('could not find platform');
		}
	} catch (e) {
		LogUtils.logError('failed to unlink twitter account', e);
		await ServiceUtils.sendOutErrorMessage(ctx).catch(Log.error);
	}
	Log.debug('finished linking account');
};

const promptToUnlink = async (ctx: CommandContext, guildMember: GuildMember, isDMOn: boolean, twitterUser: VerifiedTwitter): Promise<boolean> => {
	Log.debug('attempting to ask user for confirmation on unlinking');
	let shouldUnlinkPromise: Promise<boolean>;
	let shouldUnlinkMsg: MessageOptions | MessageOptionsSlash = {
		embeds: [
			{
				title: 'Unlink Confirmation',
				description: 'Are you sure you want to remove the twitter account from your discord? You can relink later it with `/account link`.',
				fields: [
					{ name: 'UserId', value: `${twitterUser.twitterUser.id_str}`, inline: false },
					{ name: 'Name', value: `${twitterUser.twitterUser.screen_name}`, inline: false },
					{ name: 'Description', value: `${ServiceUtils.prepEmbedField(twitterUser.twitterUser.description)}`, inline: false },
					{ name: 'Profile', value: `https://twitter.com/${twitterUser.twitterUser.screen_name}`, inline: false },
				],
			},
		],
	};
	let messageResponse: Message;
	const expiration = 600_000;
	
	if (isDMOn) {
		shouldUnlinkMsg = shouldUnlinkMsg as MessageOptions;
		shouldUnlinkMsg.components = [
			new MessageActionRow().addComponents(
				new MessageButton()
					.setCustomId(buttonIds.ACCOUNT_UNLINK_APPROVE)
					.setLabel('Yes')
					.setStyle('SUCCESS'),
				new MessageButton()
					.setCustomId(buttonIds.ACCOUNT_UNLINK_REJECT)
					.setLabel('No')
					.setStyle('DANGER'),
			),
		];
		Log.debug('attempting to send dm to user');
		Log.debug(shouldUnlinkMsg);
		messageResponse = await guildMember.send(shouldUnlinkMsg);
		Log.debug('dm message confirmation on unlink sent');
		shouldUnlinkPromise = new Promise<any>((resolve, _) => {
			messageResponse.awaitMessageComponent({
				time: expiration,
				filter: args => (args.customId == buttonIds.ACCOUNT_UNLINK_APPROVE || args.customId == buttonIds.ACCOUNT_UNLINK_REJECT)
					&& args.user.id == guildMember.id.toString(),
			}).then((interaction) => {
				if (interaction.customId == buttonIds.ACCOUNT_UNLINK_APPROVE) {
					messageResponse.edit({ components: [] }).catch(Log.error);
					resolve(true);
				} else if (interaction.customId == buttonIds.ACCOUNT_UNLINK_REJECT) {
					messageResponse.edit({ components: [] }).catch(Log.error);
					resolve(false);
				}
			}).catch(error => {
				Log.error(error);
				resolve(false);
			});
		});
	} else {
		shouldUnlinkMsg = shouldUnlinkMsg as MessageOptionsSlash;
		shouldUnlinkMsg.ephemeral = true;
		shouldUnlinkMsg.components = [
			{
				type: ComponentType.ACTION_ROW,
				components: [{
					type: ComponentType.BUTTON,
					style: ButtonStyle.SUCCESS,
					label: 'Yes',
					custom_id: buttonIds.ACCOUNT_UNLINK_APPROVE,
				}, {
					type: ComponentType.BUTTON,
					style: ButtonStyle.DESTRUCTIVE,
					label: 'No',
					custom_id: buttonIds.ACCOUNT_UNLINK_REJECT,
				}],
			},
		];
		Log.debug('attempting to send msg to user');
		Log.debug(shouldUnlinkMsg);
		const msgSlashResponse: MessageSlash = await ctx.send(shouldUnlinkMsg) as MessageSlash;
		Log.debug('ctx message on user confirmation sent');
		shouldUnlinkPromise = new Promise<any>((resolve, _) => {
			ctx.registerComponentFrom(msgSlashResponse.id, buttonIds.ACCOUNT_UNLINK_APPROVE, (compCtx: ComponentContext) => {
				if (compCtx.user.id == guildMember.id) {
					compCtx.editParent({ components: [] });
					resolve(true);
				}
			}, expiration, () => {
				ctx.send({ content: 'Message expired, please try command again.', ephemeral: true });
				resolve(false);
			});
			
			ctx.registerComponentFrom(msgSlashResponse.id, buttonIds.ACCOUNT_UNLINK_REJECT, (compCtx: ComponentContext) => {
				if (compCtx.user.id == guildMember.id) {
					compCtx.editParent({ components: [] });
					resolve(false);
				}
			}, expiration, () => {
				ctx.send({ content: 'Message expired, please try command again.', ephemeral: true });
				resolve(false);
			});
		});
		Log.debug('ctx response message registered');
	}
	return await shouldUnlinkPromise;
};

export const unlinkTwitterAccount = async (guildMember: GuildMember): Promise<void> => {
	Log.debug('removing twitter account link from db');
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_NEXTAUTH);
	const accountsCollection: Collection<NextAuthAccountCollection> = db.collection(constants.DB_COLLECTION_NEXT_AUTH_ACCOUNTS);
	
	const nextAuthAccount: NextAuthAccountCollection | null = await accountsCollection.findOne({
		providerId: 'discord',
		providerAccountId: guildMember.user.id.toString(),
	});
	
	if (nextAuthAccount == null || nextAuthAccount.userId == null) {
		Log.debug('next auth account not found');
		return;
	}
	
	const result: DeleteWriteOpResultObject = await accountsCollection.deleteMany({
		providerId: 'twitter',
		userId: new ObjectID(nextAuthAccount.userId),
	});
	
	if (result.result.ok != 1) {
		Log.warn('failed to remove twitter account');
		throw new Error('failed to unlink twitter account');
	}
	Log.debug('twitter account unlinked and removed from db');
	return;
};

export default UnlinkAccount;
