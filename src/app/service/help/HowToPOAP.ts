import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'POAP Distribution Information',
			description: 'Thank you for checking out POAP distribution!\n\n' +
				'Before commands can be used, authorized users and roles must first be set with the `/poap config` command by an admin. ' +
				'Users can then use the `/poap schedule` command to mint PNG images into POAPs.',
			fields: [
				{
					name: '-> /poap config',
					value: 'Authorize users and roles who can use the following poap commands. A malicious user and role can also be removed.',
					inline: false,
				},
				{
					name: '-> /poap schedule',
					value: 'Schedule a POAP event, upload the PNG image to be minted, and get the links.txt file over email.',
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
						'Once the event is started it must be stopped by the same user or configured user/role.',
					inline: false,
				},
				{
					name: '-> /poap end',
					value: 'Stop tracking attendees that enter the voice channel. The event has ended and a list of attendees is generated. ' +
						'Optionally send out POAP links to those who attended by providing a .txt file with the POAP links per line.',
					inline: false,
				},
			],
		}],
	};
};