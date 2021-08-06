import { Collection } from 'mongodb';
import BountyUtils from '../../utils/BountyUtils';
import { GuildMember, Message, MessageEmbed } from 'discord.js';
import { BountyCollection } from '../../types/bounty/BountyCollection';

/**
 * This service will check the bounty bouard and sync the bounty with the correct information
 * @param guildMember
 * @param bountyCollection
 */
export default async (guildMember: GuildMember, bountyCollection: BountyCollection) => {
	const bountyId = bountyCollection._id;
	const message: Message = await BountyUtils.getBountyMessage(guildMember, bountyCollection.discordMessageId);
	console.log(message);
	throw new Error('testing');
	
	console.log(`removing all reactions for bounty ${bountyId}`);
	await message.reactions.removeAll();

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[1].value = bountyCollection.status;
	
	switch (bountyCollection.status) {
	case 'Open':
		embedMessage.setColor('#1e7e34');
		embedMessage.setFooter('🏴 - start | 📝 - edit | ❌ - delete');
		await message.react('🏴');
		await message.react('📝');
		await message.react('❌');
		break;
	case 'In-Progress':
		embedMessage.setColor('#d39e00');
		embedMessage.setFooter('📮 - submit | 🆘 - help');
		await message.react('📮');
		await message.react('🆘');
		break;
	case 'In-Review':
		embedMessage.setColor('#d39e00');
		break;
	case 'Completed':
		embedMessage.setColor('#1d2124');
		break;
	case 'Deleted':
		return message.delete();
	}
	
};