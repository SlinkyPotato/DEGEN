import { MessageOptions } from 'slash-create';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'Account Information',
			description: 'These set of commands allows linking, unlinking, and viewing external accounts.\n\n',
			fields: [
				{
					name: '-> /account verify',
					value: 'Link external account to your discord account.',
					inline: false,
				},
				{
					name: '-> /account status',
					value: 'Display the currently linked accounts to your discord account.',
					inline: false,
				},
				{
					name: '-> /account unlink',
					value: 'Remove the link between your discord account and external account.',
					inline: false,
				},
				{
					name: '-> Useful Links',
					value: '[BanklessDAO Product Support Center invite](https://discord.gg/85Kb6Qv6gd)\n' +
						'[Commands Wiki](https://www.notion.so/bankless/The-POAP-Distribution-Commands-and-Workflow-96cac11447b44d27885c160dc9af85fe)\n' +
						'[Feature Request Feedback](https://degen.canny.io/feature-requests)\n' +
						'[POAP Website](https://poap.xyz/)',
					inline: false,
				},
			],
		}],
	};
};