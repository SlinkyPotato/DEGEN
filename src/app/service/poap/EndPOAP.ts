import { AwaitMessagesOptions, DMChannel, GuildChannel, GuildMember, MessageAttachment } from 'discord.js';
import { Collection, Db, UpdateWriteOpResult } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import ValidationError from '../../errors/ValidationError';
import { Buffer } from 'buffer';
import { POAPSettings } from '../../types/poap/POAPSettings';
import POAPUtils, { POAPFileParticipant } from '../../utils/POAPUtils';
import { CommandContext } from 'slash-create';
import Log from '../../utils/Log';

export default async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	
	const poapSettingsDB: Collection = db.collection(constants.DB_COLLECTION_POAP_SETTINGS);
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordUserId: guildMember.user.id,
		discordServerId: guildMember.guild.id,
		isActive: true,
	});
	
	if (poapSettingsDoc == null) {
		throw new ValidationError(`No active event found for <@${guildMember.id}>.`);
	}
	const updateSettingsResult: UpdateWriteOpResult = await poapSettingsDB.updateOne(poapSettingsDoc, {
		$set: {
			isActive: false,
		},
	});

	if (updateSettingsResult.modifiedCount !== 1) {
		throw new ValidationError('Event is not active.');
	}
	Log.info('event ended', {
		indexMeta: true,
		meta: {
			discordId: poapSettingsDoc.discordServerId,
			voiceChannelId: poapSettingsDoc.voiceChannelId,
			event: poapSettingsDoc.event,
		},
	});
	const channel: GuildChannel = await guildMember.guild.channels.fetch(poapSettingsDoc.voiceChannelId);
	const listOfParticipants = await POAPUtils.getListOfParticipants(guildMember, db, channel);
	
	if (listOfParticipants.length <= 0) {
		await guildMember.send({ content: `Event ended. No participants found for \`${channel.name}\` in \`${channel.guild.name}\`.` });
		await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
		return;
	}
	
	const bufferFile = await getBufferFromParticipants(listOfParticipants, channel);
	const currentDate = (new Date()).toISOString();
	const fileName = `${channel.guild.name}_${channel.name}_${listOfParticipants.length}_participants.csv`;
	await guildMember.send({
		embeds: [
			{
				title: 'POAP Distribution Results',
				fields: [
					{ name: 'Date', value: `${currentDate} UTC`, inline: true },
					{ name: 'Event', value: `${poapSettingsDoc.event}`, inline: true },
					{ name: 'Discord Server', value: channel.guild.name, inline: true },
					{ name: 'Location', value: channel.name, inline: true },
					{ name: 'Total Participants', value: `${listOfParticipants.length}`, inline: true },
				],
			},
		],
		files: [{ name: fileName, attachment: bufferFile }],
	});
	Log.info('POAPs distributed', {
		indexMeta: true,
		meta: {
			guildId: guildMember.guild.id,
			guildName: guildMember.guild.name,
			totalParticipants: listOfParticipants.length,
			location: channel.name,
		},
	});
	
	await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);

	if (guildMember.id !== guildMember.user.id) {
		return guildMember.send({ content: `Previous event ended for <@${guildMember.id}>.` });
	}

	await guildMember.send({ content: 'Would you like me to send out POAP links to participants? `(yes/no)`' });
	const dmChannel: DMChannel = await guildMember.createDM();
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 900000,
		errors: ['time'],
	};
	const sendOutPOAPYN = (await dmChannel.awaitMessages(replyOptions)).first().content;
	if (sendOutPOAPYN === 'y' || sendOutPOAPYN === 'Y' || sendOutPOAPYN === 'yes' || sendOutPOAPYN === 'YES') {
		await guildMember.send({ content: 'Ok! Please upload the POAP links.txt file.' });
		const poapLinksFile: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		await POAPUtils.sendOutPOAPLinks(guildMember, listOfParticipants, poapLinksFile, poapSettingsDoc.event);
		await guildMember.send({ content: 'POAP links sent out to participants!' });
		return 'POAP_SENT';
	} else {
		await guildMember.send({ content: 'You got it!' });
		return 'POAP_END';
	}
};

export const getBufferFromParticipants = async (participants: POAPFileParticipant[], voiceChannel: GuildChannel): Promise<Buffer> => {
	if (participants.length === 0) {
		Log.info(`no participants found for ${voiceChannel.name} in ${voiceChannel.guild.name}`);
		return Buffer.from('', 'utf-8');
	}

	let participantsStr = 'discordId,discordHandle,durationInMinutes\n';
	participants.forEach((participant: {id: string, tag: string, duration: number}) => {
		participantsStr += `${participant.id},${participant.tag},${participant.duration}` + '\n';
	});

	return Buffer.from(participantsStr, 'utf-8');
};