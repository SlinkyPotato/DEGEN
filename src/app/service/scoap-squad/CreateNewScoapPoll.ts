import { CommandContext, User } from 'slash-create';
// import constants from '../../constants/constants';
import ScoapUtils from '../../utils/ScoapUtils';
import { GuildMember, Message, MessageOptions, MessageReaction } from 'discord.js';
// import { finalizeBounty } from './PublishBounty';
// import { Db, Double, Int32 } from 'mongodb';
// import dbInstance from '../../../utils/db';
// import { deleteBountyForValidId } from '../DeleteBounty';
// import { BountyCreateNew } from '../../../types/bounty/BountyCreateNew';
// import ServiceUtils from '../../../utils/ServiceUtils';

// const END_OF_SEASON = new Date(2021, 8, 31).toISOString();

export default async (guildMember: GuildMember, params: any, ctx?: CommandContext): Promise<any> => {
	const title = params.title;
	const summary = params.summary;
	// const roles = params.roles;
	const reward = params.reward;
	
	// await ScoapUtils.validateReward(guildMember, reward);
	// await ScoapUtils.validateSummary(guildMember, summary);
	// await ScoapUtils.validateTitle(guildMember, title);
	// await BountyUtils.validateCriteria(guildMember, criteria);

	// const db: Db = await dbInstance.dbConnect(constants.DB_NAME_BOUNTY_BOARD);
	// const dbBounty = db.collection(constants.DB_COLLECTION_BOUNTIES);
	// const newBounty = generateBountyRecord(
	// 	params, guildMember.user.tag, guildMember.user.id,
	// );

	// const dbInsertResult = await dbBounty.insertOne(newBounty);

	// if (dbInsertResult == null) {
	// 	console.error('failed to insert bounty into DB');
	// 	return guildMember.send('Sorry something is not working, our devs are looking into it.');
	// }
	// await dbInstance.close();

	// console.log(`user ${guildMember.user.tag} inserted into db`);

	const messageOptions: MessageOptions = {
		embed: {
			title: title,
			// url: (constants.BOUNTY_BOARD_URL + dbInsertResult.insertedId),
			author: {
				icon_url: guildMember.user.avatarURL(),
				name: guildMember.user.tag,
			},
			// description: summary,
			fields: [
				// { name: 'Reward', value: newBounty.reward.amount + ' ' + newBounty.reward.currency, inline: true },
				{ name: 'Summary', value: summary },
				{ name: 'Reward', value: reward.amount + ' ' + reward.currency, inline: true },
				// { name: 'Deadline', value: ServiceUtils.formatDisplayDate(newBounty.dueAt), inline: true },
				// { name: 'Roles', value: roles },
				// { name: 'HashId', value: dbInsertResult.insertedId },
				{ name: 'CreatedBy', value: guildMember.user.tag, inline: true },
			],
			timestamp: new Date(),
			footer: {
				text: '👍 - publish | 📝 - edit | ❌ - delete',
			},
		},
	};
	ctx?.send(`${ctx.user.mention} Sent you draft SCOAP Squad request, please verify.`);
	const message: Message = await guildMember.send(
		'Please verify below information. \n' +
		'If everything is correct, \n' +
		'reply YES to this message to start \n' +
		'defining roles for your SCOAP squad. \n' +
		'Reply NO to start over \n', 
		messageOptions) as Message;
	
	await message.react('👍');
	await message.react('📝');
	await message.react('❌');

	return handleScoapReaction(message, guildMember);
};

// export const generateBountyRecord = (bountyParams: BountyCreateNew, discordHandle: string, discordId: string): any => {
// 	const currentDate = (new Date()).toISOString();
// 	return {
// 		season: new Int32(Number(process.env.DAO_CURRENT_SEASON)),
// 		title: bountyParams.title,
// 		description: bountyParams.summary,
// 		criteria: bountyParams.criteria,
// 		reward: {
// 			currency: bountyParams.reward.currencySymbol,
// 			amount: new Double(bountyParams.reward.amount),
// 		},
// 		createdBy: {
// 			discordHandle: discordHandle,
// 			discordId: discordId,
// 		},
// 		createdAt: currentDate,
// 		statusHistory: [
// 			{
// 				status: 'Draft',
// 				setAt: currentDate,
// 			},
// 		],
// 		status: 'Draft',
// 		dueAt: END_OF_SEASON,
// 	};
// };

const handleScoapReaction = (message: Message, guildMember: GuildMember): Promise<any> => {
	return message.awaitReactions((reaction, user: User) => {
		return ['📝', '👍', '❌'].includes(reaction.emoji.name) && !user.bot;
	}, {
		max: 1,
		time: (60000 * 60),
		errors: ['time'],
	}).then(collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			console.log('/scoap-squad assemble new | :thumbsup: up given');
			// return finalizeBounty(guildMember, bountyId);
			return guildMember.send('Thumbs up bro!');
		} else if (reaction.emoji.name === '📝') {
			console.log('/scoap-squad assemble new | :pencil: given');
			return guildMember.send('Sorry edit not yet available. Please delete bounty with /bounty delete command');
		} else {
			console.log('/scoap-squad assemble new | delete given');
			// return deleteBountyForValidId(guildMember, bountyId);
			return guildMember.send('Thumbs up bro!');
		}
	}).catch(_ => {
		console.log('did not react');
	});
};