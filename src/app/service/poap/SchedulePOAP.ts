import { AwaitMessagesOptions, DMChannel, GuildMember, MessageAttachment } from 'discord.js';
import POAPUtils from '../../utils/POAPUtils';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { EventsRequestType } from '../../api/types/EventsRequestType';
import axios from 'axios';
import PoapAPI from '../../api/PoapAPI';
import EventsAPI from '../../api/EventsAPI';
import { EventsResponseType } from '../../api/types/EventsResponseType';

const SchedulePOAP = async (guildMember: GuildMember, numberToMint: number): Promise<any> => {
	const db: Db = await dbInstance.dbConnect(constants.DB_NAME_DEGEN);
	await POAPUtils.validateUserAccess(guildMember, db);
	await POAPUtils.validateNumberToMint(guildMember, numberToMint);
	
	// const request: EventsRequestType = {} as EventsRequestType;
	// // request.requested_codes = numberToMint.toString();
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'POAP Scheduling',
	// // 			description: 'Welcome to the POAP scheduling command. POAP events can be scheduled for an event inside or outside of discord. ' +
	// // 				'A PNG image is uploaded and minted. The POAP links.txt file is generated and sent to the provided email address.',
	// // 		}, {
	// // 			title: 'Name of POAP Event',
	// // 			description: 'What is the name of the POAP event?',
	// // 		},
	// // 	],
	// // });
	const dmChannel: DMChannel = await guildMember.createDM();
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};
	// // request.name = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Description',
	// // 			description: 'What is this POAP event about? Tell me all of the amazingness about this event that your participants will see!',
	// // 		},
	// // 	],
	// // });
	// // request.description = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Virtual Event',
	// // 			description: 'Is this a virtual event? (y/n)',
	// // 		},
	// // 	],
	// // });
	// // request.virtual_event = (await dmChannel.awaitMessages(replyOptions)).first().content === 'y';
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'City (optional)',
	// // 			description: 'In what city does the event take place? (!skip)',
	// // 		},
	// // 	],
	// // });
	// // const city = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// // if (city != '!skip') {
	// // 	request.city = city;
	// // }
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Country (optional)',
	// // 			description: 'In what country does the event take place? (!skip)',
	// // 		},
	// // 	],
	// // });
	// // const country = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// // if (country != '!skip') {
	// // 	request.country = country;
	// // }
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Event Start',
	// // 			description: 'When does the event start? (mm-dd-yyyy)',
	// // 		},
	// // 	],
	// // });
	// // request.start_date = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Event End',
	// // 			description: 'When does the event end? (mm-dd-yyyy)',
	// // 		},
	// // 	],
	// // });
	// // request.end_date = (await dmChannel.awaitMessages(replyOptions)).first().content;
	//    request.expiry_date = request.end_date;
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Event URL',
	// // 			description: 'What is the website url? (!skip)',
	// // 		},
	// // 	],
	// // });
	// // request.event_url = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // // hardcode standard template
	// // request.event_template_id = '0';
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'One Time Edit Code',
	// // 			description: 'What should be your unique 6 digit numeric code? This code is used to make edits to the ' +
	// // 				'POAP event and allows you to mint more POAPs for additional participants (ex. 123456).',
	// // 		},
	// // 	],
	// // });
	// // request.secret_code = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'POAP Image PNG',
	// // 			description: 'Please upload the PNG image you would like to mint. Recommended 500x500 px, round shape, ' +
	// // 				'and size less than 200 KB.',
	// // 		},
	// // 	],
	// // });
	// // try {
	// // 	const poapImage: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
	// // 	request.image = await axios.get(poapImage.url);
	// // } catch (e) {
	// // 	console.log('failed to process image');
	// // }
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'Email Address',
	// // 			description: 'What email address should I send the POAP links.txt file?',
	// // 		},
	// // 	],
	// // });
	// // request.email = (await dmChannel.awaitMessages(replyOptions)).first().content;
	// //
	// // await guildMember.send({
	// // 	embeds: [
	// // 		{
	// // 			title: 'POAP Event',
	// // 			fields: [
	// // 				{ name: 'Event Title', value: request.name },
	// // 				{ name: 'Event Description', value: request.description },
	// // 				{ name: 'Virtual Event', value: (request.virtual_event ? 'yes' : 'no'), inline: true},
	// // 				{ name: 'City', value: (request.city != null ? request.city : '-'), inline: true },
	// // 				{ name: 'Country', value: (request.country != null ? request.country : '-'), inline: true },
	// // 				{ name: 'Event Start', value: request.start_date, inline: true },
	// // 				{ name: 'Event End', value: request.end_date, inline: true },
	// // 				{ name: 'Event URL', value: request.event_url, inline: true },
	// // 				{ name: 'Edit Code', value: request.secret_code, inline: true },
	// // 				{ name: 'Email', value: request.email, inline: true },
	// // 				{ name: 'Mint Copies Requested', value: request.requested_codes, inline: true },
	// // 			],
	// // 		},
	// // 		{
	// // 			title: 'POAP Event Confirmation',
	// // 			description: 'Please confirm if the above the information looks good! (y/n)',
	// // 		},
	// // 	],
	// // });
	// const approval = (await dmChannel.awaitMessages(replyOptions)).first().content == 'y';
	// if (!approval) {
	// 	await guildMember.send({ content: 'POAP event removed!' });
	// } else {
	//  request.year = '0';
	// 	const response: EventsResponseType = await EventsAPI.scheduleEvent(request);
	// 	await guildMember.send({
	// 		embeds: [
	// 			{
	// 				title: 'POAP Event Created',
	// 				description: 'POAP event created and links.txt file should be sent out shortly. Please keep an eye out on your email inbox.',
	// 				fields: [
	// 					{ name: 'POAP Backroom URL', value: 'https://app.poap.xyz/admin/events/' + response.fancy_id },
	// 					{ name: 'POAP ID', value: response.id.toString() },
	// 				],
	// 			},
	// 		],
	// 	});
	// }
	const request: EventsRequestType = {
		name: 'Bankless POAP Testing',
		description: 'description',
		city: 'city',
		country: 'country',
		start_date: '09-30-2021',
		end_date: '09-30-2021',
		expiry_date: '09-30-2021',
		year: '0',
		event_url: 'https://bankless.community',
		virtual_event: true,
		secret_code: '123456',
		event_template_id: '0',
		email: 'patinobrian@gmail.com',
		requested_codes: '1',
		image: null,
	};
	// await guildMember.send({
	// 	embeds: [
	// 		{
	// 			title: 'POAP Image PNG',
	// 			description: 'Please upload the PNG image you would like to mint. Recommended 500x500 px, round shape, ' +
	// 				'and size less than 200 KB.',
	// 		},
	// 	],
	// });
	// let imageFile;
	// try {
	// 	const poapImage: MessageAttachment = (await dmChannel.awaitMessages(replyOptions)).first().attachments.first();
	// 	console.log(poapImage.url);
	// 	imageFile = await axios.get(poapImage.url);
	// 	console.log('image processed');
	// } catch (e) {
	// 	console.log(e);
	// 	console.log('failed to process image');
	// }
	const imageFile = await axios.get('https://cdn.discordapp.com/attachments/851313193934651403/893266991425683476/Screen_Shot_2021-08-23_at_8.20.21_PM.png', {
		responseType: 'arraybuffer',
	});
	// console.log(imageFile.data);
	const convImage = Buffer.from(imageFile.data, 'binary');
	const response: EventsResponseType = await EventsAPI.scheduleEvent(request, convImage);
	console.log(response);
};

export default SchedulePOAP;