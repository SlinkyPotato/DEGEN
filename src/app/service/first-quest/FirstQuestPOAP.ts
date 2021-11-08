import { GuildMember, MessageAttachment, TextBasedChannels } from 'discord.js';
import { askForLinksMessageAttachment } from '../poap/DistributePOAP';
import { CommandContext } from 'slash-create';
import axios from 'axios';
import { LogUtils } from '../../utils/Log';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import roleIds from '../constants/roleIds';
import channelIds from '../constants/channelIds';
// import client from "../../app";

export default async (guildMember: GuildMember, ctx: CommandContext): Promise<any> => {

	ctx?.send(`Hi, ${ctx.user.mention}! I sent you a DM with more information.`);

	const refillType = ctx.options['poap-refill']['refill-type'];

	if (!['ADD', 'REPLACE'].includes(refillType)) return guildMember.send({ content: 'Please use a valid refill-type' });

	const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);

	const linkList = await getListOfPOAPLinks(guildMember, linksMessageAttachment);

	const expirationDate = await getExpirationDate(guildMember);

	const timestamp = Date.parse(expirationDate);

	switch (refillType) {
	case 'ADD':

		if (linkList !== null) {
			await writePOAPLinksToDb(linkList, timestamp);

			return guildMember.send({ content: 'POAP claim links successfully updated' });

		} else {
			return guildMember.send({ content: 'links.txt file seems to be empty, please try again.' });
		}
	case 'REPLACE':

		if (linkList !== null) {
			await retirePOAPLinks();

			await writePOAPLinksToDb(linkList, timestamp);

			return guildMember.send({ content: 'POAP claim links successfully updated' });

		} else {
			return guildMember.send({ content: 'links.txt file seems to be empty, please try again.' });
		}
	}
};

const getExpirationDate = async (guildMember: GuildMember): Promise<any> => {
	await guildMember.send({ content: 'Please enter expiration date of POAP. Format: DD-MM-YYY' });

	const expirationDate = await ServiceUtils.getFirstUserReply(await guildMember.createDM());

	const dateReg = /^\d{2}([./-])\d{2}\1\d{4}$/;

	if (expirationDate.match(dateReg)) {
		return expirationDate;
	} else {
		await guildMember.send({ content: 'Incorrect date input.' });
		await getExpirationDate(guildMember);
	}
};

const getListOfPOAPLinks = async (guildMember: GuildMember, attachment: MessageAttachment): Promise<any> => {
	let listOfPOAPLinks;

	try {
		const response = await axios.get(attachment.url);

		listOfPOAPLinks = response.data.split('\n');

	} catch (e) {
		LogUtils.logError('failed to process links.txt file', e);

		await guildMember.send({ content: 'Could not process the links.txt file. Please make sure the file that is uploaded has every URL on a new line.' });
	}

	return listOfPOAPLinks;
};

const writePOAPLinksToDb = async (links: Array<string>, timestamp: number): Promise<void> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	for (const link of links) {
		if (link.length > 0) {
			await firstQuestPOAPs.insertOne({ link: link, current: true, claimed: '', expiration: timestamp });
		}
	}
};

const retirePOAPLinks = async (): Promise<void> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	const filter = { current: true };

	const options = { upsert: false };

	const updateDoc = { $set: { current: false } };

	await firstQuestPOAPs.updateMany(filter, updateDoc, options);
};

export const getPOAPLink = async (guildMember: GuildMember):Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	const userExists = await firstQuestPOAPs.find({ claimed: guildMember.user.id }).toArray();

	if (userExists.length > 0) {
		return guildMember.send({ content: 'There is one POAP per user. Seems like you got yours already.' });
	}

	const filter = { current: true, claimed: '' };

	const theMany = await firstQuestPOAPs.find(filter).toArray();

	if (theMany.length === 50) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content: `<@&${ roleIds.firstQuestProject }> : We're running short on POAPs (50). Please refill with **/first-quest poap-refill**` });

	} else if (theMany.length === 10) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content: `<@&${ roleIds.firstQuestProject }> : **Last warning**, running really short on POAPs here (10). Please refill with **/first-quest poap-refill**` });

	} else if (theMany.length === 0) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content: `<@&${roleIds.firstQuestProject}> : We're out of POAPs. Please refill with **/first-quest poap-refill**` });

		return guildMember.send({ content: 'Sorry, we\'re currently out of POAPs. Check the support channel to get help.' });
	}

	const theOne = await firstQuestPOAPs.findOne(filter);

	const filter2 = { _id: theOne._id };

	const options = { upsert: false };

	const updateDoc = { $set: { claimed: guildMember.user.id } };

	await firstQuestPOAPs.updateOne(filter2, updateDoc, options);

	return guildMember.send({ content: `Here is your POAP: ${theOne.link}` });
};

// export const checkPOAPExpiration = async () => {
// 	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
//
// 	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);
//
// 	const filter = { current: true, claimed: '' };
//
// 	const activePOAPLinks = await firstQuestPOAPs.find(filter).toArray();
//
// 	for (const entry of activePOAPLinks) {
// 		if ((entry.expiration - +new Date()) < (1000*60*60*24*10)) {
// 			const guilds = await client.guilds.fetch();
//
// 			for (const oAuth2Guild of guilds.values()) {
// 				const guild = await oAuth2Guild.fetch();
//
// 				if (guild.id === fqUser.guild) {
// 					const channels = await guild.channels.fetch();
//
// 					const supportChannel = channels.get(channelIds.generalSupport) as TextBasedChannels;
//
// 					await supportChannel.send({ content: `User <@${fqUser._id}> appears to be stuck in first-quest, please extend some help.` });
// 				}
// 			}
// 		}
// 	}
// };
