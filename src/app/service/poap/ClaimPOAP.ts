import { CommandContext } from 'slash-create';
import { GuildMember, MessageEmbed } from 'discord.js';
import { Cursor, Db } from 'mongodb';
import MongoDbUtils from '../../utils/dbUtils';
import constants from '../constants/constants';
import { POAPUnclaimedParticipants } from '../../types/poap/POAPUnclaimedParticipants';
import Log from '../../utils/Log';

const ClaimPOAP = async (ctx: CommandContext, guildMember: GuildMember, platform: string, code: string): Promise<any> => {
	
	if (platform == constants.PLATFORM_TYPE_TWITTER) {
		await ctx.send('Twitter platform is not supported at this time. Please reach out to community organizer for missing POAP');
		return;
	}
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	const unclaimedParticipantsCollection = await db.collection(constants.DB_COLLECTION_POAP_PARTICIPANTS);
	const unclaimedParticipants: Cursor<POAPUnclaimedParticipants> = await unclaimedParticipantsCollection.find({
		discordUserId: guildMember.user.id,
		claimCode: code,
	});
	const embedMessageList: MessageEmbed[] = await unclaimedParticipants.map((doc: POAPUnclaimedParticipants) => {
		return new MessageEmbed({
			title: `Event: ${doc.event}`,
			description: `${doc.poapLink}`,
		});
	}).toArray();
	
	await guildMember.send({
		embeds: embedMessageList,
	});
	
	Log.info(unclaimedParticipants);
};

export default ClaimPOAP;