import { AwaitMessagesOptions, DMChannel, GuildMember, Message, MessageAttachment } from 'discord.js';
import axios from 'axios';
import POAPUtils, { POAPFileParticipant } from '../../utils/POAPUtils';

export default async (guildMember: GuildMember): Promise<any> => {
	
	const participantsList: POAPFileParticipant[] = await askForParticipantsList(guildMember);
	const linksMessageAttachment: MessageAttachment = await askForLinksMessageAttachment(guildMember);
	await POAPUtils.sendOutPOAPLinks(guildMember, participantsList, linksMessageAttachment);
};

export const askForParticipantsList = async (guildMember: GuildMember): Promise<POAPFileParticipant[]> => {
	const message: Message = await guildMember.send({ content: 'Please upload participants.csv file.' });
	const dmChannel: DMChannel = await message.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	let participantsList = [];
	try {
		const participantAttachment: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		const fileResponse = await axios.get(participantAttachment.url);
		participantsList = fileResponse.data.split('\n').map(participant => {
			const values = participant.split(',');
			return {
				id: values[0],
				tag: values[1],
				duration: values[2],
			};
		});
		// remove first and last object
		participantsList.shift();
		participantsList.pop();
	} catch (e) {
		console.log(e);
		await guildMember.send({ content: 'Invalid attachment. Please try the command again.' });
	}
	return participantsList;
};

export const askForLinksMessageAttachment = async (guildMember: GuildMember): Promise<MessageAttachment> => {
	const sendOutPOAPReplyMessage = await guildMember.send({ content: 'Please upload links.txt file from POAP.' });
	const dmChannel: DMChannel = await sendOutPOAPReplyMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	return (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
};