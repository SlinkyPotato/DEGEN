import { CommandContext } from 'slash-create';
import { GuildMember, MessageEmbed } from 'discord.js';
import { Collection, Cursor, Db } from 'mongodb';
import MongoDbUtils from '../../utils/dbUtils';
import constants from '../constants/constants';
import { POAPUnclaimedParticipants } from '../../types/poap/POAPUnclaimedParticipants';
import Log, { LogUtils } from '../../utils/Log';

const ClaimPOAP = async (ctx: CommandContext, guildMember: GuildMember, platform: string, code: string): Promise<any> => {
	Log.debug(`starting claim with claimCode: ${code}`);
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await ctx.send('Twitter platform is not supported at this time. Please reach out to community organizer for missing POAP');
		return;
	}
	
	try {
		await guildMember.send({ content: 'Hello! Just need a moment to look for your poaps...' });
	} catch (e) {
		LogUtils.logError('DM is turned off', e, guildMember.guild.id);
		await ctx.send('I\'m having trouble sending you a DM... Can you try turning it on and trying again?');
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection: Collection<POAPUnclaimedParticipants> = await db.collection(constants.DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS);
	const unclaimedParticipants: Cursor<POAPUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		discordUserId: guildMember.user.id,
		claimCode: code,
	});
	
	if (!await unclaimedParticipants.hasNext()) {
		await guildMember.send({ content: 'Hmm.. I could not find any poaps 🤷' });
		await ctx.send('Could not find any poaps 🤷‍');
		return;
	}
	
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
	
	await unclaimedParticipantsCollection.deleteMany({
		discordUserId: guildMember.user.id,
		claimCode: code,
	});
	
};

export default ClaimPOAP;