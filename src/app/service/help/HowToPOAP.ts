import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'POAP Distribution Information',
			description: 'Thank you for checking out POAP distribution!\n\n' +
				'I can record attendees and distribute POAP links to those same attendees. A maximum of one active event ' +
				'is allowed per voice channel.',
			fields: [
				{
					name: '-> /poap config',
					value: 'Assign poap command access to roles or specific users.',
					inline: false,
				},
				{
					name: '-> /poap distribute',
					value: 'Distribute POAP links to a given list of attendees. The attendees .csv file is generated from ' +
						'/poap end command. The POAP links.txt file is generated from the POAP setup via email.',
					inline: false,
				},
				{
					name: '-> /poap start',
					value: 'Start tracking attendees as they enter and exit the specified voice channel. ' +
						'Once event is started it must be stopped by the same user or configured user/role.',
					inline: false,
				},
				{
					name: '-> /poap end',
					value: 'Stop tracking attendees that enter the voice channel. The event has ended and a list of attendees is generated. ' +
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