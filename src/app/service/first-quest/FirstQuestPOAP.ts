import {
	DMChannel,
	GuildMember,
	MessageAttachment,
	NewsChannel,
	PartialDMChannel,
	TextBasedChannels,
	TextChannel,
	ThreadChannel,
} from 'discord.js';
import { askForLinksMessageAttachment } from '../poap/DistributePOAP';
import { CommandContext } from 'slash-create';
import axios from 'axios';
import Log, { LogUtils } from '../../utils/Log';
import { Db } from 'mongodb';
import dbInstance from '../../utils/MongoDbUtils';
import constants from '../constants/constants';
import ServiceUtils from '../../utils/ServiceUtils';
import roleIds from '../constants/roleIds';
import channelIds from '../constants/channelIds';
import client from '../../app';

export default async (guildMember: GuildMember, ctx: CommandContext): Promise<any> => {

	ctx?.send(`Hi, ${ctx.user.mention}! I sent you a DM with more information.`);

	const refillType = ctx.options['poap-refill']['refill-type'];

	if (!['ADD', 'REPLACE'].includes(refillType)) {
		return guildMember.send({ content: 'Please use a valid refill-type' });
	}

	const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);

	const linkList = await getListOfPOAPLinks(guildMember, linksMessageAttachment);

	if (!linkList) return guildMember.send({ content: 'Please run the command again.' });

	const timestamp = await getExpirationDate(guildMember);

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
	await guildMember.send({ content: 'Please enter expiration date of POAP. Format: DD/MM/YYYY' });

	const expirationDate = await ServiceUtils.getFirstUserReply(await guildMember.createDM());

	const dateReg = /^\d{2}([/])\d{2}\1\d{4}$/;

	if (expirationDate.match(dateReg)) {
		const split = expirationDate.split('/');

		const date = new Date(split[2], split[1] - 1, split[0]);

		const timestamp = date.getTime();

		if (timestamp <= +new Date()) {
			await guildMember.send({ content: 'Expiration Date can not be in the past. Please try again.' });
			return await getExpirationDate(guildMember);
		}

		return timestamp;

	} else {
		await guildMember.send({ content: 'Incorrect date input. Please try again' });
		return await getExpirationDate(guildMember);
	}
};

const getListOfPOAPLinks = async (guildMember: GuildMember, attachment: MessageAttachment): Promise<any> => {
	let listOfPOAPLinks;

	try {
		const response = await axios.get(attachment.url);

		listOfPOAPLinks = response.data.split('\n');

	} catch (e) {
		LogUtils.logError('failed to process links.txt file', e);

		await guildMember.send({ content:
				'Could not process the links.txt file. Please make sure ' +
				'the file that is uploaded has every URL on a new line.' });
	}

	return listOfPOAPLinks;
};

const writePOAPLinksToDb = async (links: Array<string>, timestamp: number): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	for (const link of links) {
		if (link.length > 0) {
			await firstQuestPOAPs.insertOne({ link: link, current: true, claimed: '', expiration: timestamp, expirationReminder: 0 });
		}
	}
};

const retirePOAPLinks = async (): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	const filter = { current: true };

	const options = { upsert: false };

	const updateDoc = { $set: { current: false } };

	await firstQuestPOAPs.updateMany(filter, updateDoc, options);
};

export const getPOAPLink = async (guildMember: GuildMember):Promise<any> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	const userExists = await firstQuestPOAPs.find({ claimed: guildMember.user.id }).toArray();

	if (userExists.length > 0) {
		return guildMember.send({ content: 'There is one POAP per user. Seems like you got yours already.' });
	}

	const filter1 = { current: true, claimed: '' };

	const theMany = await firstQuestPOAPs.find(filter1).toArray();

	// send warnings if we run short on POAP links
	if (theMany.length === 300) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content:
				`<@&${ roleIds.firstQuestProject }> : We're running short on POAPs, ` +
				'only 300 links left. Please refill with **/first-quest poap-refill**' });

	} else if (theMany.length === 150) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content:
				`<@&${ roleIds.firstQuestProject }> : **Last warning**, running really short on ` +
				'POAPs here, only 150 links left. Please refill with **/first-quest poap-refill**' });

	} else if (theMany.length === 0) {
		const channels = await guildMember.guild.channels.fetch();

		const fqProjectChannel = channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		await fqProjectChannel.send({ content:
				`<@&${roleIds.firstQuestProject}> : We're out of POAPs. ` +
				'Please refill with **/first-quest poap-refill**' });

		return guildMember.send({ content:
				'Sorry, we\'re currently out of POAPs. Check the support channel to get help.' });
	}

	// this part makes sure that older claim links are used up first - ignoring retired links
	const timestampAggregate = await firstQuestPOAPs.aggregate([
		{ '$match': {	current: true } }, { '$group' : { _id:'$expiration', count:{ $sum:1 } } },
	]).toArray();

	const timestampArray = timestampAggregate.map(entry => entry._id);

	const min = Math.min.apply(null, timestampArray);

	const filter2 = { current: true, claimed: '', expiration: min };

	const theOne = await firstQuestPOAPs.findOne(filter2);

	// this part updates db record with ID of claimant
	const filter3 = { _id: theOne._id };

	const options = { upsert: false };

	const updateDoc = { $set: { claimed: guildMember.user.id } };

	await firstQuestPOAPs.updateOne(filter3, updateDoc, options);

	return guildMember.send({ content: `Here is your POAP: ${theOne.link}` });
};

export const checkPOAPExpiration = async (): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const firstQuestPOAPs = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_POAPS);

	const timestampAggregate = await firstQuestPOAPs.aggregate([
		{ '$match': {	current: true } }, { '$group' : { _id:'$expiration', count:{ $sum:1 } } },
	]).toArray();

	const timestampArray = timestampAggregate.map(entry => entry._id);

	for (const ts of timestampArray) {
		// expired, set current to false
		if (ts <= +new Date()) {
			const updateDoc = { $set: { current: false } };

			await firstQuestPOAPs.updateMany({ expiration: ts }, updateDoc, { upsert: false });

		// send 10 day reminder	(sent only once)
		} else if ((ts - +new Date()) <= (1000 * 60 * 60 * 24 * 10) && (ts - +new Date()) > (1000 * 60 * 60 * 24 * 2)) {
			if (await firstQuestPOAPs.find({ expiration: ts, expirationReminder: 10 }).count() === 0) {
				const channel = await getFqProjectChannel();

				if (channel) {
					channel.send({ content: `<@&${roleIds.firstQuestProject}>: Some POAPs expire in the next 10 days` });

					const report = createExpirationReport(timestampAggregate);

					channel.send({ content: ((`**Report:**\n${report}`).length < 2000) ?
						`**Report:**\n${report}` : 'Report exceeds max length. This is unusual, please seek dev support' });

					channel.send({ content: 'You can use **/first-quest poap-refill** to top up the supply' });

					const updateDoc = { $set: { expirationReminder: 10 } };

					await firstQuestPOAPs.updateMany({ expiration: ts }, updateDoc, { upsert: false });

				} else {
					Log.warn('Unable to get text channel, First quest POAPs about to expire in 10 days');
				}
			}

		// send 2 day reminder	(sent only once)
		} else if ((ts - +new Date()) <= (1000 * 60 * 60 * 24 * 2)) {
			if (await firstQuestPOAPs.find({ expiration: ts, expirationReminder: 2 }).count() === 0) {
				const channel = await getFqProjectChannel();

				if (channel) {
					channel.send({ content: `<@&${roleIds.firstQuestProject}>: Some POAPs expire in the next 2 days` });

					const report = createExpirationReport(timestampAggregate);

					channel.send({ content: ((`**Report:**\n${report}`).length < 2000) ?
						`**Report:**\n${report}` : 'Report exceeds max length. This is unusual, please seek dev support' });

					channel.send({ content: 'You can use **/first-quest poap-refill** to top up the supply' });

					const updateDoc = { $set: { expirationReminder: 2 } };

					await firstQuestPOAPs.updateMany({ expiration: ts }, updateDoc, { upsert: false });

				} else {
					Log.warn('Unable to get text channel, First quest POAPs about to expire in 10 days');
				}
			}
		}
	}
};

const createExpirationReport = (timestampAggregate) => {
	let msg = '';

	for (const element of timestampAggregate) {

		if (element._id > +new Date()) {
			const days = (element._id - +new Date()) / (1000 * 60 * 60 * 24);

			msg += `${ element.count } claim links expire in ${ (Math.round(days) >= 1) ?
				Math.round(days) : 'less than 1' } day(s)\n`;
		}
	}

	return msg;
};

const getFqProjectChannel = async (): Promise<null | PartialDMChannel | DMChannel | TextChannel | NewsChannel | ThreadChannel> => {
	const guilds = await client.guilds.fetch();

	for (const oAuth2Guild of guilds.values()) {
		const guild = await oAuth2Guild.fetch();

		const channels = await guild.channels.fetch();

		try {
			return await channels.get(channelIds.firstQuestProject) as TextBasedChannels;

		} catch {
			Log.debug('first quest project channel not found');
		}
	}

	return null;
};