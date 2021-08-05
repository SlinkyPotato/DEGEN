import { GuildMember, Message, MessageReaction, User } from 'discord.js';
import channelIDs from '../../service/constants/channelIDs';
import { claimBountyForValidId } from '../../service/bounty/ClaimBounty';
import { deleteBountyForValidId } from '../../service/bounty/DeleteBounty';
import { submitBountyForValidId } from '../../service/bounty/SubmitBounty';
import { completeBountyForValidId } from '../../service/bounty/CompleteBounty';
import { seekHelpValidBountyId } from '../../service/bounty/SeekHelpBounty';

export default (reaction: MessageReaction, user: User): Promise<any> => {
	if (reaction.message.channel.id !== channelIDs.bountyBoard) {
		console.log('reaction for another channel');
		return;
	}
	const message: Message = reaction.message;
	const bountyId: string = message.embeds[0].fields[5].value;
	const guildMember: GuildMember = reaction.message.guild.member(user);

	if (reaction.emoji.name === '🏴') {
		console.log(`${user.tag} attempting to claim a bounty ${bountyId} from the bounty board`);
		return claimBountyForValidId(guildMember, bountyId, message);
	} else if (reaction.emoji.name === '📝') {
		console.log(`${user.tag} attempting to edit bounty ${bountyId} from the bounty board`);
		return user.send('Sorry edit not yet available. Please delete bounty with /bounty delete command');
	} else if (reaction.emoji.name === '❌') {
		console.log(`${user.tag} attempting to delete bounty ${bountyId}`);
		return deleteBountyForValidId(guildMember, bountyId, message);
	} else if (reaction.emoji.name === '📮') {
		console.log(`${user.tag} attempting to submit bounty ${bountyId}`);
		// TODO: have bot ask user for details
		return submitBountyForValidId(guildMember, bountyId, null, null, message);
	} else if (reaction.emoji.name === '✅') {
		console.log(`${user.tag} attempting to mark bounty ${bountyId} complete`);
		return completeBountyForValidId(guildMember, bountyId, message);
	} else if (reaction.emoji.name === '🆘') {
		console.log(`${user.tag} attempting to seek help for bounty ${bountyId}`);
		return seekHelpValidBountyId(guildMember, bountyId);
	}
};