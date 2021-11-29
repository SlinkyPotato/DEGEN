import Log from '../../../utils/Log';
import ServiceUtils from '../../../utils/ServiceUtils';
import { POAPSettings } from '../../../types/poap/POAPSettings';
import { Db } from 'mongodb';
import {
	askUserForChannel,
	generateVoiceChannelEmbedMessage, setActiveEventInDb,
} from './StartPOAP';
import { CommandContext } from 'slash-create';
import {
	GuildMember,
	StageChannel,
	VoiceChannel,
	GuildChannel, TextChannel,
} from 'discord.js';
import {
	Collection as CollectionMongo,
} from 'mongodb';
import { Collection } from '@discordjs/collection';
import { MessageEmbedOptions as MessageEmbedOptionsSlash } from 'slash-create/lib/structures/message';
const StartChannelFlow = async (
	ctx: CommandContext, guildMember: GuildMember, db: Db, event: string, duration: number,
	poapSettingsDB: CollectionMongo<POAPSettings>,
): Promise<void> => {
	Log.debug('starting channel flow for poap start');
	const voiceChannels: Collection<string, VoiceChannel | StageChannel> = ServiceUtils.getAllVoiceChannels(guildMember);
	
	await ctx.sendFollowUp({ content: 'Hello ser, I can help you get started with your event!' });
	const embedsVoiceChannels = generateVoiceChannelEmbedMessage(voiceChannels) as MessageEmbedOptionsSlash[];
	const message = await ctx.sendFollowUp({ embeds: embedsVoiceChannels });
	
	const channel: TextChannel = await guildMember.guild.channels.fetch(message.channelID) as TextChannel;
	const channelChoice: GuildChannel = await askUserForChannel(guildMember, channel, voiceChannels);
	
	const poapSettingsDoc: POAPSettings = await poapSettingsDB.findOne({
		discordServerId: channelChoice.guild.id,
		voiceChannelId: channelChoice.id,
	});
	
	if (poapSettingsDoc !== null && poapSettingsDoc.isActive) {
		Log.warn('unable to start due to active event');
		await ctx.sendFollowUp(`\`${channelChoice.name}\` is already active. Please reach out to <@${poapSettingsDoc.discordUserId}> to end event.`);
		return;
	}
	
	await setActiveEventInDb(guildMember, db, channelChoice, event, duration);
	
	await ctx.sendFollowUp({
		embeds: [
			{
				title: 'Event Started',
				fields: [
					{ name: 'Event', value: `${event == null ? '-' : event} `, inline: true },
					{ name: 'Organizer', value: `${guildMember.user.tag} `, inline: true },
					{ name: 'Discord Server', value: `${guildMember.guild.name} `, inline: true },
					{ name: 'Location', value: `${channelChoice.name} `, inline: true },
					{ name: 'Platform', value: 'Discord', inline: true },
					{ name: 'Duration', value: `${duration} minutes`, inline: true },
				],
			},
		],
	});
};

export default StartChannelFlow;