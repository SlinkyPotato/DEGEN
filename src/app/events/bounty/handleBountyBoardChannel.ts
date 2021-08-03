import { GuildMember, Message, MessageReaction, User } from 'discord.js';
import channelIDs from '../../constants/channelIDs';
import { claimBountyForValidId } from '../../service/bounty/ClaimBounty';
import { deleteBountyForValidId } from '../../service/bounty/DeleteBounty';
import { completeBountyForValidId } from '../../service/bounty/CompleteBounty';

export default (reaction: MessageReaction, user: User): Promise<any> => {
	if (reaction.message.channel.id !== channelIDs.bountyBoard) {
		console.log('reaction for another channel');
		return;
	}
	const message: Message = reaction.message;
	const bountyId: string = message.embeds[0].fields[6].value;
	const guildMember: GuildMember = reaction.message.guild.member(user);

	if (reaction.emoji.name === '🏴') {
		console.log(`${user.tag} attempting to claim a bounty from the bounty board`);
		return claimBountyForValidId(guildMember, bountyId, message);
	} else if (reaction.emoji.name === '📝') {
		console.log(`${user.tag} attempting to edit a bounty from the bounty board`);
		return user.send('Sorry edit not yet available. Please delete bounty with /bounty delete command');
	} else if (reaction.emoji.name === '❌') {
		console.log(`${user.tag} attempting to delete a bounty`);
		return deleteBountyForValidId(guildMember, bountyId, message);
	} else if (reaction.emoji.name === '✅') {
		console.log(`${user.tag} attempting to mark bounty complete`);
		// TODO: have bot ask user for details
		return completeBountyForValidId(guildMember, bountyId, null, null, message);
	} else if (reaction.emoji.name === '🆘') {
		console.log(`${user.tag} attempting to seek help`);
	}
};