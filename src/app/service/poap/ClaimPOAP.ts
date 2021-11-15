import { CommandContext } from 'slash-create';
import { GuildMember, MessageEmbed } from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import { POAPUnclaimedParticipants } from '../../types/poap/POAPUnclaimedParticipants';
import Log from '../../utils/Log';
import ServiceUtils from '../../utils/ServiceUtils';
import { MessageEmbedOptions } from 'slash-create/lib/structures/message';

const ClaimPOAP = async (ctx: CommandContext, platform: string, guildMember?: GuildMember): Promise<any> => {
	Log.debug(`starting claim for ${ctx.user.username}, with ID: ${ctx.user.id}`);

	if (guildMember != null) {
		await ServiceUtils.tryDMUser(guildMember, 'So you want a POAP? *sigh*...');
	}

	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await ctx.send('So, the Twitter platform isn\'t supported with what you\'re trying to do here. ' +
			'Reach out to community organizer to hook you up with your POAP.');
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
		await ctx.send('Sorry bud, I couldn\'t find anything...');
		return;
	}
	Log.debug('POAP found');
	
	if (guildMember != null) {
		Log.debug('attempting to send message from channel!');
		const embedMessageList: MessageEmbed[] = await unclaimedParticipants.map((doc: POAPUnclaimedParticipants) => {
			return new MessageEmbed({
				title: 'POAP link',
				description: 'Thank you for participating in the community event!',
				fields: [
					{ name: 'Discord', value: `${doc.discordServerName}`, inline: false },
					{ name: 'Event', value: `${doc.event}`, inline: true },
					{ name: 'Claim Link', value: `${doc.poapLink}`, inline: true },
				],
			});
		}).toArray();
		
		await guildMember.send({
			embeds: embedMessageList,
		});
		await ctx.send({ content: 'Sent you a DM!' });
	} else {
		Log.debug('attempting to send message from DM!');
		const embedMessageList: MessageEmbedOptions[] = await unclaimedParticipants.map((doc: POAPUnclaimedParticipants) => {
			return {
				title: 'POAP link',
				description: 'Thank you for participating in the community event!',
				fields: [
					{ name: 'Discord', value: `${doc.discordServerName}`, inline: false },
					{ name: 'Event', value: `${doc.event}`, inline: true },
					{ name: 'Claim Link', value: `${doc.poapLink}`, inline: true },
				],
			} as MessageEmbedOptions;
		}).toArray();
		await ctx.send({
			embeds: embedMessageList,
		});
	}
	Log.debug('message sent to user!');
	
	await unclaimedParticipantsCollection.deleteMany({
		discordUserId: ctx.user.id,
	});
	
	Log.debug('POAP claimed and deleted from db');
};

export default ClaimPOAP;