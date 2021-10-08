import { AwaitMessagesOptions, DMChannel, GuildMember, MessageAttachment } from 'discord.js';
import POAPUtils from '../../utils/POAPUtils';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { EventsRequestType } from '../../api/types/poap-events/EventsRequestType';
import axios, { AxiosResponse } from 'axios';
import EventsAPI from '../../api/EventsAPI';
import { EventsResponseType } from '../../api/types/poap-events/EventsResponseType';
import ValidationError from '../../errors/ValidationError';

const SchedulePOAP = async (guildMember: GuildMember, numberToMint: number): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	await POAPUtils.validateNumberToMint(guildMember, numberToMint);
	
	const request: EventsRequestType = {} as EventsRequestType;
	request.requested_codes = numberToMint.toString();
	
	await guildMember.send({
		embeds: [
			{
				title: 'POAP Scheduling',
				description: 'Welcome to the POAP scheduling command. POAP events can be scheduled for an event inside or outside of discord. ' +
					'A PNG image is uploaded and minted. The POAP links.txt file is generated and sent to the provided email address.',
			}, {
				title: 'Name of POAP Event',
				description: 'What is the name of the POAP event?',
			},
		],
	});
	const dmChannel: DMChannel = await guildMember.createDM();
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	request.name = (await dmChannel.awaitMessages(replyOptions)).first().content;

	await guildMember.send({
		embeds: [
			{
				title: 'Description',
				description: 'What is this POAP event about? Tell me all of the amazingness about this event that your participants will see!',
			},
		],
	});
	request.description = (await dmChannel.awaitMessages(replyOptions)).first().content;

	await guildMember.send({
		embeds: [
			{
				title: 'Virtual Event',
				description: 'Is this a virtual event? (y/n)',
			},
		],
	});
	request.virtual_event = (await dmChannel.awaitMessages(replyOptions)).first().content === 'y';

	await guildMember.send({
		embeds: [
			{
				title: 'City (optional)',
				description: 'In what city does the event take place? (!skip)',
			},
		],
	});
	const city = (await dmChannel.awaitMessages(replyOptions)).first().content;
	request.city = (city != '!skip') ? city : '-';

	await guildMember.send({
		embeds: [
			{
				title: 'Country (optional)',
				description: 'In what country does the event take place? (!skip)',
			},
		],
	});
	const country = (await dmChannel.awaitMessages(replyOptions)).first().content;
	request.country = (country != '!skip') ? country : '-';

	await guildMember.send({
		embeds: [
			{
				title: 'Event Start',
				description: 'When does the event start? (mm-dd-yyyy)',
			},
		],
	});
	request.start_date = (await dmChannel.awaitMessages(replyOptions)).first().content;

	await guildMember.send({
		embeds: [
			{
				title: 'Event End',
				description: 'When does the event end? (mm-dd-yyyy)',
			},
		],
	});
	request.end_date = (await dmChannel.awaitMessages(replyOptions)).first().content;
	request.expiry_date = request.end_date;
	await guildMember.send({
		embeds: [
			{
				title: 'Event URL (optional)',
				description: 'What is the website url? (!skip)',
			},
		],
	});
	const websiteUrl = (await dmChannel.awaitMessages(replyOptions)).first().content;
	request.event_url = (websiteUrl != '!skip') ? websiteUrl : '-';
	
	// hardcode standard template
	request.event_template_id = '0';

	await guildMember.send({
		embeds: [
			{
				title: 'One Time Edit Code',
				description: 'What should be your unique 6 digit numeric code? This code is used to make edits to the ' +
					'POAP event and allows you to mint more POAPs for additional participants (ex. 123456).',
			},
		],
	});
	request.secret_code = (await dmChannel.awaitMessages(replyOptions)).first().content;

	await guildMember.send({
		embeds: [
			{
				title: 'POAP Image PNG',
				description: 'Please upload the PNG image you would like to mint. Recommended 500x500 px, round shape, ' +
					'and size less than 200 KB.',
			},
		],
	});
	let imageResponse: AxiosResponse;
	try {
		const poapImage: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
		imageResponse = await axios.get(poapImage.url, {
			responseType: 'arraybuffer',
		});
		request.image = imageResponse;
	} catch (e) {
		console.log(e);
		throw new ValidationError('Please try another PNG image.');
	}

	await guildMember.send({
		embeds: [
			{
				title: 'Email Address',
				description: 'What email address should I send the POAP links.txt file?',
			},
		],
	});
	request.email = (await dmChannel.awaitMessages(replyOptions)).first().content;

	await guildMember.send({
		embeds: [
			{
				title: 'POAP Event',
				fields: [
					{ name: 'Event Title', value: request.name },
					{ name: 'Event Description', value: request.description },
					{ name: 'Virtual Event', value: (request.virtual_event ? 'yes' : 'no'), inline: true },
					{ name: 'City', value: request.city, inline: true },
					{ name: 'Country', value: request.country, inline: true },
					{ name: 'Event Start', value: request.start_date, inline: true },
					{ name: 'Event End', value: request.end_date, inline: true },
					{ name: 'Event URL', value: request.event_url, inline: true },
					{ name: 'Edit Code', value: request.secret_code, inline: true },
					{ name: 'Email', value: request.email, inline: true },
					{ name: 'Mint Copies Requested', value: request.requested_codes, inline: true },
				],
			},
			{
				title: 'POAP Event Confirmation',
				description: 'Please confirm if the above the information looks good! (y/n)',
			},
		],
	});
	const approval = (await dmChannel.awaitMessages(replyOptions)).first().content == 'y';
	if (!approval) {
		await guildMember.send({ content: 'POAP event removed!' });
	} else {
		request.year = '0';
		const response: EventsResponseType = await EventsAPI.scheduleEvent(request);
		await guildMember.send({
			embeds: [
				{
					title: 'POAP Event Created',
					description: 'POAP event created and links.txt file should be sent out shortly. Please keep an eye out on your email inbox.',
					fields: [
						{ name: 'POAP Backroom URL', value: 'https://app.poap.xyz/admin/events/' + response.fancy_id },
						{ name: 'POAP ID', value: response.id.toString() },
					],
				},
			],
		});
	}
};

export default SchedulePOAP;