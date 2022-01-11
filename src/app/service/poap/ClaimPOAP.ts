import { CommandContext, EmbedField } from 'slash-create';
import {
	DMChannel,
	GuildMember,
	MessageEmbedOptions,
} from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { POAPUnclaimedParticipants } from '../../types/poap/POAPUnclaimedParticipants';
import Log from '../../utils/Log';
import { POAPTwitterUnclaimedParticipants } from '../../types/poap/POAPTwitterUnclaimedParticipants';
import VerifyTwitter, { VerifiedTwitter } from '../account/VerifyTwitter';
import dayjs from 'dayjs';
import {
	EmbedField as EmbedFieldSlash,
	MessageEmbedOptions as MessageEmbedOptionsSlash,
} from 'slash-create/lib/structures/message';
import POAPUtils from '../../utils/POAPUtils';
import apiKeys from '../constants/apiKeys';

const ClaimPOAP = async (ctx: CommandContext, platform: string, guildMember?: GuildMember): Promise<any> => {
	Log.debug(`starting claim for ${ctx.user.username}, with ID: ${ctx.user.id}`);
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		if (!guildMember) {
			await ctx.send({ content: 'Please try command within discord server.', ephemeral: true });
			return;
		}
		await claimPOAPForTwitter(ctx, guildMember);
		return;
	}
	await claimForDiscord(ctx.user.id, ctx);
};

export const claimForDiscord = async (userId: string, ctx?: CommandContext | null, dmChannel?: DMChannel | null): Promise<void> => {
	Log.debug('Discord platform chosen');
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection: Collection<POAPUnclaimedParticipants> = await db.collection(constants.DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS);
	
	Log.debug('looking for POAP in db');
	let unclaimedParticipants: Cursor<POAPUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		discordUserId: userId,
	});
	
	Log.debug('checking for POAP from db');
	if (!await unclaimedParticipants.hasNext()) {
		Log.debug('POAP not found');
		const msg = 'There doesn\'t seem to be any POAPs yet.';
		if (ctx) {
			await ctx.send({ content: msg, ephemeral: true });
		} else if (dmChannel) {
			await dmChannel.send(msg);
		}
		return;
	}
	
	const numberOfPOAPs: number = await unclaimedParticipants.count();
	Log.debug(`${numberOfPOAPs} POAP found`);
	POAPUtils.validateMaximumPOAPClaims(numberOfPOAPs);
	
	// resetting the cursor from the count
	unclaimedParticipants = await unclaimedParticipantsCollection.find({
		discordUserId: userId,
	});
	
	if (ctx) {
		Log.debug('sending message in channel');
		await ctx.send({ content: `POAP claimed! Consider sending \`gm\` to <@${apiKeys.DISCORD_BOT_ID}>` });
		const embeds: MessageEmbedOptionsSlash[] = await generatePOAPClaimEmbedMessages(numberOfPOAPs, unclaimedParticipants) as MessageEmbedOptionsSlash[];
		await ctx.send({
			embeds: embeds,
			ephemeral: true,
		});
	} else if (dmChannel) {
		Log.debug('sending DM to user');
		const embeds: MessageEmbedOptions[] = await generatePOAPClaimEmbedMessages(numberOfPOAPs, unclaimedParticipants) as MessageEmbedOptions[];
		await dmChannel.send({
			embeds: embeds,
		});
	}
	
	Log.debug('message sent to user!');
	
	unclaimedParticipantsCollection.updateMany({
		discordUserId: userId,
	}, {
		$set: {
			expiresAt: dayjs().add(1, 'day').toISOString(),
		},
	}).catch(Log.error);
	Log.debug('updated expiration for POAPs in DB and POAPs claimed');
};

const claimPOAPForTwitter = async (ctx: CommandContext, guildMember: GuildMember) => {
	Log.debug('claiming POAP for Twitter');

	const verifiedTwitter: VerifiedTwitter | undefined = await VerifyTwitter(ctx, guildMember);
	if (verifiedTwitter == null) {
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection: Collection<POAPTwitterUnclaimedParticipants> = await db.collection(constants.DB_COLLECTION_POAP_TWITTER_UNCLAIMED_PARTICIPANTS);

	Log.debug('looking for POAP in twitter db');
	let unclaimedParticipants: Cursor<POAPTwitterUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		twitterUserId: verifiedTwitter.twitterUser.id_str,
	});

	Log.debug('checking for POAP from twitter db');
	if (!await unclaimedParticipants.hasNext()) {
		Log.debug('POAP not found');
		await ctx.send('Sorry bud, I couldn\'t find anything...');
		return;
	}
	const numberOfPOAPs: number = await unclaimedParticipants.count();
	Log.debug('POAP found');
	POAPUtils.validateMaximumPOAPClaims(numberOfPOAPs);
	
	// resetting the cursor from the count
	unclaimedParticipants = await unclaimedParticipantsCollection.find({
		twitterUserId: verifiedTwitter.twitterUser.id_str,
	});
	
	// TODO: use generatePOAPClaimEmbedMessages to handle 240 POAPs
	const fieldsList: EmbedField[] = await unclaimedParticipants.map((doc: POAPTwitterUnclaimedParticipants) => {
		return ({
			name: 'Claim Link',
			value: `${doc.poapLink}`,
			inline: false,
		} as EmbedField);
	}).toArray();
	
	await ctx.send({
		embeds: [{
			title: 'POAP link',
			description: 'Thank you for participating in the community event!',
			fields: fieldsList,
		}],
		ephemeral: true,
	});
	
	Log.debug('message sent to user! POAP claimed');
	
	unclaimedParticipantsCollection.updateMany({
		twitterUserId:  verifiedTwitter.twitterUser.id_str,
	}, {
		$set: {
			expiresAt: dayjs().add(1, 'day').toISOString(),
		},
	}).catch(Log.error);
	Log.debug('updated expiration for POAPs in DB and POAPs claimed');
};

/**
 * Generate an array of message embed objects where each object has a maximum of 24 fields.
 * @param numberOfPOAPs
 * @param unclaimedParticipants
 */
const generatePOAPClaimEmbedMessages = async (
	numberOfPOAPs: number,
	unclaimedParticipants: Cursor<POAPUnclaimedParticipants>,
): Promise<MessageEmbedOptions[] | MessageEmbedOptionsSlash[]> => {
	Log.debug('starting to process POAPs for embed message');
	const embedOptions: MessageEmbedOptions[] | MessageEmbedOptionsSlash[] = [];
	let embedFields: EmbedField[] | EmbedFieldSlash[] = [];
	let k = 0;
	while (await unclaimedParticipants.hasNext()) {
		const doc: POAPUnclaimedParticipants | null = await unclaimedParticipants.next();
		if (doc == null) {
			continue;
		}
		if (k < 8) {
			embedFields.push({
				name: 'Event',
				value: `${doc.event}`,
				inline: true,
			} as EmbedField);
			embedFields.push({
				name: 'Server',
				value: `${doc.discordServerName}`,
				inline: true,
			} as EmbedField);
			embedFields.push({
				name: 'Claim Link',
				value: `${doc.poapLink}`,
				inline: false,
			} as EmbedField);
			k++;
		} else {
			embedOptions.push({
				title: 'POAP Badge',
				description: 'Thank you for participating in the community event!',
				fields: embedFields,
			});
			k = 0;
			embedFields = [{
				name: 'Event',
				value: `${doc.event}`,
				inline: true,
			}, {
				name: 'Server',
				value: `${doc.discordServerName}`,
				inline: true,
			}, {
				name: 'Claim Link',
				value: `${doc.poapLink}`,
				inline: false,
			}];
		}
	}
	if (embedFields.length >= 1) {
		embedOptions.push({
			title: 'POAP Badge',
			description: 'Thank you for participating in the community event!',
			fields: embedFields,
		});
	}
	Log.debug('finished processing POAPs for embed message');
	return embedOptions;
};

export default ClaimPOAP;