import { MessageOptions } from 'slash-create';
import envUrls from '../constants/envUrls';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'Bounty Board Information',
			description: 'Thank you for checking out bounties!\n\n' +
				'This bot can be used to create, publish, claim, submit, complete, and delete bounties. The workflow for a bounty ' +
				'follows from a draft, to published, in progress, in review, and complete.',
			fields: [{
				name: '-> Useful Links',
				value: `[Bounty Board Website](${envUrls.BOUNTY_BOARD_URL})\n` +
					'[Commands Wiki](https://bankless.notion.site/The-Bounty-Board-Commands-and-Workflow-7f15bbc3f2c744afab1cb5f90daac4a2)',
				inline: true,
			}],
			footer: {
				icon_url: null,
				text: '',
			},
		}],
	};
};