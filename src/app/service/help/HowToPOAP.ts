import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'POAP Distribution Information',
			description: 'Thank you for checking out POAP distribution!\n\n' +
				'This bot can be used to record attendees and distribute POAP links to those same attendees.',
			fields: [
				{
					name: '-> /poap start',
					value: 'Start keeping track of attendees in the voice channel. The voice channel depends on the event.\n\n ' +
						'Community Call: Community Calls (stage)\n' +
						'Dev Guild: dev workroom',
					inline: false,
				},
				{
					name: '-> /poap end',
					value: 'Stop tracking members that enter the voice channel. The event has ended and a list of attendees is generated. ' +
						'Optionally send out POAP links to those who attended by providing a .txt file with the POAP links per line.',
					inline: false,
				},
			],
			footer: {
				icon_url: null,
				text: '@Bankless DAO 🏴',
			},
		}],
	};
};