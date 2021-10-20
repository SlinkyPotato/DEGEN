import { DMChannel, GuildMember, MessageAttachment } from 'discord.js';
import POAPUtils from '../../utils/POAPUtils';
import { Db } from 'mongodb';
import dbInstance from '../../utils/dbUtils';
import constants from '../constants/constants';
import { EventsRequestType } from '../../api/types/poap-events/EventsRequestType';
import axios, { AxiosResponse } from 'axios';
import EventsAPI from '../../api/EventsAPI';
import { EventsResponseType } from '../../api/types/poap-events/EventsResponseType';
import ValidationError from '../../errors/ValidationError';
import { CommandContext } from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import { LogUtils } from '../../utils/Log';
import DateUtils from '../../utils/DateUtils';

const SchedulePOAP = async (ctx: CommandContext, guildMember: GuildMember, numberToMint: number): Promise<any> => {
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
	await ctx.send(`Hey ${ctx.user.mention}, I just sent you a DM!`);
	
	const dmChannel: DMChannel = await guildMember.createDM();
	request.name = await ServiceUtils.getFirstUserReply(dmChannel);

	await guildMember.send({
		embeds: [
			{
				title: 'Description',
				description: 'What is this POAP event about? Tell me all of the amazingness about this event that your participants will see!',
			},
		],
	});
	request.description = await ServiceUtils.getFirstUserReply(dmChannel);

	await guildMember.send({
		embeds: [
			{
				title: 'Virtual Event',
				description: 'Is this a virtual event? (y/n)',
			},
		],
	});
	request.virtual_event = await ServiceUtils.getFirstUserReply(dmChannel) === 'y';

	await guildMember.send({
		embeds: [
			{
				title: 'City (optional)',
				description: 'In what city does the event take place? (!skip)',
			},
		],
	});
	const city = await ServiceUtils.getFirstUserReply(dmChannel);
	request.city = (city != '!skip') ? city : '-';

	await guildMember.send({
		embeds: [
			{
				title: 'Country (optional)',
				description: 'In what country does the event take place? (!skip)',
			},
		],
	});
	const country = await ServiceUtils.getFirstUserReply(dmChannel);
	request.country = (country != '!skip') ? country : '-';

	await guildMember.send({
		embeds: [
			{
				title: 'Event Start',
				description: 'When does the event start UTC? (yyyy-mm-dd)',
			},
		],
	});
	const startDate = (await ServiceUtils.getFirstUserReply(dmChannel));
	const startDateObj = DateUtils.getDate(startDate);
	request.start_date = POAPUtils.getDateString(startDateObj);
	request.year = POAPUtils.getEventYear(startDateObj);

	await guildMember.send({
		embeds: [
			{
				title: 'Event End',
				description: 'When does the event end UTC? (yyyy-mm-dd)',
			},
		],
	});
	const endDate = await ServiceUtils.getFirstUserReply(dmChannel);
	const endDateObj = DateUtils.getDate(endDate);
	request.end_date = POAPUtils.getDateString(endDateObj);
	
	request.expiry_date = POAPUtils.getExpiryDate(endDate);
	await guildMember.send({
		embeds: [
			{
				title: 'Event URL (optional)',
				description: 'What is the website url? (!skip)',
			},
		],
	});
	const websiteUrl = await ServiceUtils.getFirstUserReply(dmChannel);
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
	request.secret_code = await ServiceUtils.getFirstUserReply(dmChannel);

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
		const poapImage: MessageAttachment = (await dmChannel.awaitMessages({
			max: 1,
			time: 900000,
			errors: ['time'],
		})).first().attachments.first();
		
		imageResponse = await axios.get(poapImage.url, {
			responseType: 'arraybuffer',
		});
		request.image = imageResponse;
	} catch (e) {
		LogUtils.logError('failed to get png image from user', e);
		await dmChannel.send({ content: 'Sorry, image was not processed. ' });
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
	request.email = await ServiceUtils.getFirstUserReply(dmChannel);

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
	const approval = await ServiceUtils.getFirstUserReply(dmChannel) == 'y';
	if (!approval) {
		await guildMember.send({ content: 'POAP event removed!' });
	} else {
		try {
			const response: EventsResponseType | void = await EventsAPI.scheduleEvent(request);
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
					{
						title: 'POAP Mint Approval Instructions',
						description: 'Until December 1st, there will be two options for those wishing to host events with POAP. ' +
							'@Early Issuers  will be able to request approval in the approval-requests channel. For everyone else, ' +
							'a request will need to be submitted to our implementation team through poap.xyz/form. Please submit ' +
							'as an "I want to use POAP at my next event" outreach; we don’t promise we’ll make it happen, but ' +
							'are going to do what we can to approve reasonable requests. Entitled behaviour ' +
							'(like pushing the team on urgency, or white-glove customer support requirements) will result in ' +
							'a pretty immediate refusal of service, so please self-reflect before engaging....(read more)',
						fields: [
							{ name: 'POAP Approval Request Form', value: 'https://poap.xyz/form' },
							{ name: 'POAP Invite Link', value: 'https://discord.gg/phzxc7xem8' },
							{ name: 'POAP Announcement Message', value: 'https://discord.com/channels/622859637309571072/761627974440452121/898289547450941511' },
						],
					},
				],
			});
		} catch (e) {
			await guildMember.send({ content: 'Sorry something broke, can you please try again in the discord server?' });
		}
	}
};

export default SchedulePOAP;