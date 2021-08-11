import { GuildMember, Message, MessageReaction, User } from 'discord.js';
import channelIDs from '../../service/constants/channelIDs';
import { claimBountyForValidId } from '../../service/bounty/ClaimBounty';
import { deleteBountyForValidId } from '../../service/bounty/DeleteBounty';
import { submitBountyForValidId } from '../../service/bounty/SubmitBounty';
import { completeBountyForValidId } from '../../service/bounty/CompleteBounty';
import { seekHelpValidBountyId } from '../../service/bounty/SeekHelpBounty';
import BountyUtils from '../../utils/BountyUtils';
import RefreshBounty from '../../service/bounty/RefreshBounty';
import UpdateEditKeyBounty from '../../service/bounty/UpdateEditKeyBounty';

export default (reaction: MessageReaction, user: User): Promise<any> => {
	if (reaction.message.channel.id !== channelIDs.bountyBoard) {
		return;
	}
	const message: Message = reaction.message;
	const bountyId: string = BountyUtils.getBountyIdFromEmbedMessage(message);
	const guildMember: GuildMember = reaction.message.guild.member(user);

	if (reaction.emoji.name === '🏴') {
		console.log(`${user.tag} attempting to claim a bounty ${bountyId} from the bounty board`);
		return claimBountyForValidId(guildMember, bountyId, message).catch(console.error);
	} else if (reaction.emoji.name === '📝') {
		return UpdateEditKeyBounty(guildMember, bountyId, message).catch(console.error);
	} else if (reaction.emoji.name === '❌') {
		console.log(`${user.tag} attempting to delete bounty ${bountyId}`);
		return deleteBountyForValidId(guildMember, bountyId, message).catch(console.error);
	} else if (reaction.emoji.name === '📮') {
		console.log(`${user.tag} attempting to submit bounty ${bountyId}`);
		// TODO: have bot ask user for details
		return submitBountyForValidId(guildMember, bountyId, null, null, message).catch(console.error);
	} else if (reaction.emoji.name === '✅') {
		console.log(`${user.tag} attempting to mark bounty ${bountyId} complete`);
		return completeBountyForValidId(guildMember, bountyId, message).catch(console.error);
	} else if (reaction.emoji.name === '🆘') {
		console.log(`${user.tag} attempting to seek help for bounty ${bountyId}`);
		return seekHelpValidBountyId(guildMember, bountyId).catch(console.error);
	} else if (reaction.emoji.name === '🔄') {
		console.log(`${user.tag} attempting to refresh bounty ${bountyId}`);
		return RefreshBounty(guildMember, bountyId, message).catch(console.error);
	}
};