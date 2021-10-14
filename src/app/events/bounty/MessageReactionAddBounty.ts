import { GuildMember, Message, MessageReaction, User } from 'discord.js';
import channelIds from '../../service/constants/channelIds';
import { claimBountyForValidId } from '../../service/bounty/ClaimBounty';
import { deleteBountyForValidId } from '../../service/bounty/DeleteBounty';
import { submitBountyForValidId } from '../../service/bounty/SubmitBounty';
import { completeBountyForValidId } from '../../service/bounty/CompleteBounty';
import { seekHelpValidBountyId } from '../../service/bounty/SeekHelpBounty';
import BountyUtils from '../../utils/BountyUtils';
import RefreshBounty from '../../service/bounty/RefreshBounty';
import UpdateEditKeyBounty from '../../service/bounty/UpdateEditKeyBounty';
import ReCreateBounty from '../../service/bounty/ReCreateBounty';
import Log from '../../utils/Log';

export default async (reaction: MessageReaction, user: User): Promise<any> | null => {
	if (reaction.message.channel.id !== channelIds.bountyBoard) {
		return;
	}
	
	let message: Message = await reaction.message.fetch();
	
	if (message.embeds == null || message.embeds[0] == null || message.embeds[0].fields[4] == null) {
		return;
	}
	
	const bountyId: string = BountyUtils.getBountyIdFromEmbedMessage(message);
	const guildMember: GuildMember = await reaction.message.guild.members.fetch(user);
	
	if (message.webhookId !== null) {
		Log.log('message created by webhook');
		await message.delete();
		message = await ReCreateBounty(guildMember, bountyId).catch(console.error) as Message;
	}
	
	if (message === null) {
		console.log('message not found');
		return;
	}

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