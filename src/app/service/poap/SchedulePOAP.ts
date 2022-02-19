import {
	GuildMember,
	Message,
	MessageAttachment,
	MessageOptions,
	TextChannel,
} from 'discord.js';
import POAPUtils from '../../utils/POAPUtils';
import { Db } from 'mongodb';
import constants from '../constants/constants';
import { EventsRequestType } from '../../api/types/poap-events/EventsRequestType';
import axios, { AxiosResponse } from 'axios';
import EventsAPI from '../../api/poap/EventsAPI';
import { EventsResponseType } from '../../api/types/poap-events/EventsResponseType';
import ValidationError from '../../errors/ValidationError';
import { CommandContext } from 'slash-create';
import ServiceUtils from '../../utils/ServiceUtils';
import Log, { LogUtils } from '../../utils/Log';
import DateUtils from '../../utils/DateUtils';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { MessageOptions as MessageOptionsSlash } from 'slash-create';

const SchedulePOAP = async (ctx: CommandContext, guildMember: GuildMember, numberToMint: number): Promise<any> => {
	if (ctx.guildID == undefined) {
		await ctx.send('Please try poap mint within discord channel');
		return;
	}

	await ctx.defer(true);
	
	const db: Db = await MongoDbUtils.connect(constants.DB_NAME_DEGEN);
	
	await POAPUtils.validateUserAccess(guildMember, db);
	POAPUtils.validateNumberToMint(numberToMint);
	
	const request: EventsRequestType = {} as EventsRequestType;
	request.requested_codes = numberToMint.toString();
	
	const msg1 = {
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
	};
	
	await ctx.sendFollowUp(msg1);
	
	const contextChannel: TextChannel = await guildMember.guild.channels.fetch(ctx.channelID) as TextChannel;
	request.name = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);

	const msg2 = {
		embeds: [
			{
				title: 'Description',
				description: 'What is this POAP event about? Tell me all of the amazingness about this event that your participants will see!',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg2, guildMember, ctx);
	
	request.description = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);

	const msg3 = {
		embeds: [
			{
				title: 'Virtual Event',
				description: 'Is this a virtual event? (y/n)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg3, guildMember, ctx);
	request.virtual_event = await ServiceUtils.getFirstUserReply(guildMember, contextChannel) === 'y';

	const msg4 = {
		embeds: [
			{
				title: 'City (optional)',
				description: 'In what city does the event take place? (!skip)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg4, guildMember, ctx);
	const city = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);
	request.city = (city != '!skip') ? city : '-';

	const msg5 = {
		embeds: [
			{
				title: 'Country (optional)',
				description: 'In what country does the event take place? (!skip)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg5, guildMember, ctx);
	const country = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);
	request.country = (country != '!skip') ? country : '-';

	const msg6 = {
		embeds: [
			{
				title: 'Event Start',
				description: 'When does the event start UTC? (yyyy-mm-dd)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg6, guildMember, ctx);
	const startDate = (await ServiceUtils.getFirstUserReply(guildMember, contextChannel));
	const startDateObj = DateUtils.getDate(startDate);
	request.start_date = POAPUtils.getDateString(startDateObj);
	request.year = POAPUtils.getEventYear(startDateObj);

	const msg7 = {
		embeds: [
			{
				title: 'Event End',
				description: 'When does the event end UTC? (yyyy-mm-dd)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg7, guildMember, ctx);
	const endDate = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);
	const endDateObj = DateUtils.getDate(endDate);
	request.end_date = POAPUtils.getDateString(endDateObj);
	
	request.expiry_date = POAPUtils.getExpiryDate(endDate);
	
	const msg8 = {
		embeds: [
			{
				title: 'Event URL (optional)',
				description: 'What is the website url? (!skip)',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg8, guildMember, ctx);
	const websiteUrl = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);
	request.event_url = (websiteUrl != '!skip') ? websiteUrl : '-';
	
	// hardcode standard template
	request.event_template_id = '0';

	const msg9 = {
		embeds: [
			{
				title: 'One Time Edit Code',
				description: 'What should be your unique 6 digit numeric code? This code is used to make edits to the ' +
					'POAP event and allows you to mint more POAPs for additional participants (ex. 123456).',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg9, guildMember, ctx);
	request.secret_code = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);

	const msg10 = {
		embeds: [
			{
				title: 'POAP Image PNG',
				description: 'Please upload the PNG image you would like to mint. Recommended 500x500 px, round shape, ' +
					'and size less than 200 KB.',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg10, guildMember, ctx);
	let imageResponse: AxiosResponse;
	try {
		const message: Message | undefined = (await contextChannel.awaitMessages({
			max: 1,
			time: 900000,
			errors: ['time'],
		})).first();
		
		if (!message) {
			throw new ValidationError('Invalid image, please try the command again');
		}
		
		const poapImage: MessageAttachment | undefined = message.attachments.first();
		
		if (!poapImage) {
			throw new ValidationError('Invalid image, please try the command again');
		}
		
		imageResponse = await axios.get(poapImage.url, {
			responseType: 'arraybuffer',
		});
		request.image = imageResponse;
	} catch (e) {
		LogUtils.logError('failed to get png image from user', e);
		throw new ValidationError('Please try another PNG image.');
	}

	const msg11 = {
		embeds: [
			{
				title: 'Email Address',
				description: 'What email address should I send the POAP links.txt file?',
			},
		],
	};
	await ServiceUtils.sendContextMessage(msg11, guildMember, ctx);
	request.email = await ServiceUtils.getFirstUserReply(guildMember, contextChannel);

	const msg12: MessageOptions | MessageOptionsSlash = {
		embeds: [
			{
				title: 'POAP Event',
				fields: [
					{ name: 'Event Title', value: request.name },
					{ name: 'Event Description', value: request.description },
					{ name: 'Virtual Event', value: (request.virtual_event ? 'yes' : 'no'), inline: true },
					{ name: 'City', value: `${ServiceUtils.prepEmbedField(request.city)}`, inline: true },
					{ name: 'Country', value: `${ServiceUtils.prepEmbedField(request.country)}`, inline: true },
					{ name: 'Event Start', value: request.start_date, inline: true },
					{ name: 'Event End', value: request.end_date, inline: true },
					{ name: 'Event URL', value: `${request.event_url} `, inline: true },
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
	};
	await ServiceUtils.sendContextMessage(msg12, guildMember, ctx);
	const approval = await ServiceUtils.getFirstUserReply(guildMember, contextChannel) == 'y';
	if (!approval) {
		const msg13 = { content: 'POAP event removed!' };
		await ServiceUtils.sendContextMessage(msg13, guildMember, ctx);
	} else {
		try {
			const response: EventsResponseType | void = await EventsAPI.scheduleEvent(request);
			Log.debug('POAP minted!');
			const msg13 = {
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
			};
			await ServiceUtils.sendContextMessage(msg13, guildMember, ctx);
		} catch (e) {
			throw new ValidationError('There was a problem processing the request. Please try again or consider using the POAP backroom office https://app.poap.xyz/admin');
		}
	}
};

export default SchedulePOAP;