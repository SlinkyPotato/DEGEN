import constants from '../constants/constants';

export default (): { embeds: any[] } => {
	return {
		embeds: [{
			title: 'POAP Distribution Information',
			description: 'DEGEN is a discord bot that helps distribute POAPs to eligible participates. It can also `mint` poaps before an event has started.',
			fields: [
				{
					name: '-> /setup',
					value: 'Initialize all of the settings needed for DEGEN to operate. This command should automatically execute after degen is invited.',
					inline: false,
				},
				{
					name: '-> /poap config modify',
					value: 'Authorize users and roles who can use poap commands. A malicious user and role can also be removed.',
					inline: false,
				},
				{
					name: '-> /poap config list',
					value: 'Display a list of authorized users and roles that can use the POAP commands.',
					inline: false,
				},
				{
					name: '-> /poap mint',
					value: 'Mint a POAP for an event, upload the PNG image to be minted, and get the links.txt file over email.',
					inline: false,
				},
				{
					name: '-> /poap distribute',
					value: 'Distribute POAP links to a given list of attendees. The attendees .csv file is generated from ' +
						'/poap end command. The POAP links.txt file is generated from the POAP setup via email.',
					inline: false,
				},
				{
					name: '-> /poap claim',
					value: 'Claim your missing POAP for an event that you attended but did not receive. Must have been in the discussion for 10 minutes and must have not been deafened.',
					inline: false,
				},
				{
					name: '-> /claim',
					value: 'Same as /poap claim.',
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
				{
					name: '-> Useful Links',
					value: '[BanklessDAO Product Support Center invite](https://discord.gg/85Kb6Qv6gd)\n' +
						'[Youtube Tutorials](https://www.youtube.com/playlist?list=PLc6o7Cxn7Uq6DQCptSItO5_IQfegCRImb)\n' +
						'[Docs](https://docs.bankless.community)\n' +
						'[Feature Request Feedback](' + constants.FEATURE_REQUEST_CHANNEL_INVITE + ')\n' +
						'[POAP Website](https://poap.xyz/)',
					inline: false,
				},
			],
		}],
	};
};
