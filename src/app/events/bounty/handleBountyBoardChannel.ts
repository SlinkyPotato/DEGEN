import { MessageReaction, User } from 'discord.js';
import channelIDs from '../../constants/channelIDs';
import { deleteBounty, deleteBountyForValidId } from '../../service/bounty/deleteBounty';
import claim from '../../service/bounty/claim';

export default async (reaction: MessageReaction, user: User) => {
	if (!(reaction.message.channel.id === channelIDs.bountyBoard)) {
		// reaction for another channel
		return;
	}

	if (reaction.emoji.name === '🏴') {
		console.log(`${user.tag} claimed a bounty from the bounty board`);
		// return claim(ctx, guildMember, bountyId);
	} else if (reaction.emoji.name === '📝') {
		console.log(`${user.tag} edited a bounty from the bounty board`);
		// return guildMember.send('Please go to website to make changes');
		// return user.send('Sorry edit not yet available. Please delete bounty with /bounty delete command');
	} else if (reaction.emoji.name === '❌') {
		console.log(`${user.tag} deleted a bounty`);
		// return deleteBounty();
	} else {
		console.log('invalid emoji given');
	}
};