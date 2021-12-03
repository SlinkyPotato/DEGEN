import { CommandContext, EmbedField } from 'slash-create';
import { GuildMember } from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { POAPUnclaimedParticipants } from '../../types/poap/POAPUnclaimedParticipants';
import Log from '../../utils/Log';
import { POAPTwitterUnclaimedParticipants } from '../../types/poap/POAPTwitterUnclaimedParticipants';
import VerifyTwitter, { VerifiedTwitter } from '../account/VerifyTwitter';
import dayjs from 'dayjs';

const ClaimPOAP = async (ctx: CommandContext, platform: string, guildMember?: GuildMember): Promise<any> => {
	Log.debug(`starting claim for ${ctx.user.username}, with ID: ${ctx.user.id}`);
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await claimPOAPForTwitter(ctx, guildMember);
		return;
	}
	
	Log.debug('Discord platform chosen');
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection: Collection<POAPUnclaimedParticipants> = await db.collection(constants.DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS);
	
	Log.debug('looking for POAP in db');
	const unclaimedParticipants: Cursor<POAPUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		discordUserId: ctx.user.id,
	});
	
	Log.debug('checking for POAP from db');
	if (!await unclaimedParticipants.hasNext()) {
		Log.debug('POAP not found');
		await ctx.send('Sorry bud, I couldn\'t find anything...', { ephemeral: true });
		return;
	}
	
	Log.debug('POAP found');
	const fieldsList: EmbedField[] = await unclaimedParticipants.map((doc: POAPUnclaimedParticipants) => {
		return ({
			name: 'Claim Link',
			value: `${doc.poapLink}`,
			inline: false,
		} as EmbedField);
	}).toArray();
	
	await ctx.send({ content: `POAP claimed using \`/poap claim platform: ${platform}\`. Thank you!` });
	
	await ctx.send({
		embeds: [{
			title: 'POAP link',
			description: 'Thank you for participating in the community event!',
			fields: fieldsList,
		}],
		ephemeral: true,
	});
	
	Log.debug('message sent to user!');
	
	unclaimedParticipantsCollection.updateMany({
		discordUserId: ctx.user.id,
	}, {
		$set: {
			expiresAt: dayjs().toISOString(),
		},
	}).catch(Log.error);
	
	Log.debug('updated expiration for POAPs in DB');
	
	setTimeout(() => {
		Log.debug('deleted poaps from claim');
		unclaimedParticipantsCollection.deleteMany({
			discordUserId: ctx.user.id,
		});
	}, 300000);
	
	Log.debug('POAP claimed');
};

const claimPOAPForTwitter = async (ctx: CommandContext, guildMember: GuildMember) => {
	Log.debug('claiming POAP for Twitter');

	const verifiedTwitter: VerifiedTwitter = await VerifyTwitter(ctx, guildMember);
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection: Collection<POAPTwitterUnclaimedParticipants> = await db.collection(constants.DB_COLLECTION_POAP_TWITTER_UNCLAIMED_PARTICIPANTS);

	Log.debug('looking for POAP in twitter db');
	const unclaimedParticipants: Cursor<POAPTwitterUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		twitterUserId: verifiedTwitter.twitterUser.id_str,
	});

	Log.debug('checking for POAP from twitter db');
	if (!await unclaimedParticipants.hasNext()) {
		Log.debug('POAP not found');
		await ctx.send('Sorry bud, I couldn\'t find anything...');
		return;
	}
	Log.debug('POAP found');
	
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
	
	Log.debug('message sent to user!');

	setTimeout(() => {
		Log.debug('deleted poaps from claim twitter');
		unclaimedParticipantsCollection.deleteMany({
			twitterUserId: verifiedTwitter.twitterUser.id_str,
		});
	}, 600000);
	
	Log.debug('POAP claimed.');
};

export default ClaimPOAP;