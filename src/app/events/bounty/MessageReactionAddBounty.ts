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
import Log, { LogUtils } from '../../utils/Log';

export default async (reaction: MessageReaction, user: User): Promise<any> | null => {
	// if (reaction.message.channel.id !== channelIds.bountyBoard) {
	// 	return;
	// }
	let message: Message = await reaction.message.fetch();
	Log.info(`Processing reaction to message ${message.id}`)
	
	if (message.embeds == null || message.embeds[0] == null || message.embeds[0].fields[4] == null) {
		return;
	}
	
	const bountyId: string = BountyUtils.getBountyIdFromEmbedMessage(message);
	const guildMember: GuildMember = await reaction.message.guild.members.fetch(user);
	
	if (message.webhookId !== null) {
		Log.info('message created by webhook');
		await message.delete();
		message = await ReCreateBounty(guildMember, bountyId).catch(e => LogUtils.logError('recreating bounty failed', e)) as Message;
	}
	
	if (message === null) {
		Log.debug('message not found');
		return;
	}

	if (reaction.emoji.name === '🏴') {
		Log.info(`${user.tag} attempting to claim a bounty ${bountyId} from the bounty board`);
		return claimBountyForValidId(guildMember, bountyId, message.guildId, message).catch(e => LogUtils.logError('failed to claim bounty', e));
	} else if (reaction.emoji.name === '📝') {
		return UpdateEditKeyBounty(guildMember, bountyId, message).catch(e => LogUtils.logError('failed to update bounty', e));
	} else if (reaction.emoji.name === '❌') {
		Log.info(`${user.tag} attempting to delete bounty ${bountyId}`);
		return deleteBountyForValidId(guildMember, bountyId, message.guildId, message).catch(e => LogUtils.logError('failed to delete bounty', e));
	} else if (reaction.emoji.name === '📮') {
		Log.info(`${user.tag} attempting to submit bounty ${bountyId}`);
		// TODO: have bot ask user for details
		return submitBountyForValidId(guildMember, bountyId, null, null, message.guildId, message).catch(e => LogUtils.logError('failed to submit bounty', e));
	} else if (reaction.emoji.name === '✅') {
		Log.info(`${user.tag} attempting to mark bounty ${bountyId} complete`);
		return completeBountyForValidId(guildMember, bountyId, message.guildId, message).catch(e => LogUtils.logError('failed to complete bounty', e));
	} else if (reaction.emoji.name === '🆘') {
		Log.info(`${user.tag} attempting to seek help for bounty ${bountyId}`);
		return seekHelpValidBountyId(guildMember, bountyId).catch(e => LogUtils.logError('failed to seek help for bounty', e));
	} else if (reaction.emoji.name === '🔄') {
		Log.info(`${user.tag} attempting to refresh bounty ${bountyId}`);
		return RefreshBounty(guildMember, bountyId, message).catch(e => LogUtils.logError('failed to refresh bounty', e));
	}
};