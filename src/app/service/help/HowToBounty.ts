import { MessageOptions } from 'slash-create';
import envUrls from '../constants/envUrls';

export default (): MessageOptions => {
	return {
		embeds: [{
			title: 'Bounty Board Information',
			description: 'Thank you for checking out bounties!\n\n' +
				'This bot can be used to create, publish, claim, submit, complete, and delete bounties. The workflow for a bounty ' +
				'follows from a draft, to published, in progress, in review, and complete.',
			fields: [
				{
					name: '-> /bounty create',
					value: 'Draft a bounty for publication. This is the first step in the bounty creation process. Using this command in the channel `#📬spammy-stuff will` ' +
						'create a draft of the bounty and send it to your DM for confirmation.',
					inline: false,
				},
				{
					name: '-> /bounty publish 👍',
					value: 'Publish a bounty on the board. Using the same emoji or slash command, finalize the drafted bounty. ' +
						'Once finalized, the bounty is posted onto the official `#🧀-bounty-board` and the ' +
						`[website](${envUrls.BOUNTY_BOARD_URL}). The bounty is viewable publicly and can be claimed (started) by anyone.`,
					inline: false,
				},
				{
					name: '-> /bounty claim 🏴',
					value: 'Start working on a bounty. This command will assign a bounty to your discord handle. The bot ' +
						'and will notify the bounty creator that you have started working on this. ',
					inline: false,
				},
				{
					name: '-> /bounty submit 📮',
					value: 'Submit work for the bounty. Use this command to notify the creator that the work is complete and ready for review.',
					inline: false,
				},
				{
					name: '-> /bounty complete ✅',
					value: 'Mark bounty complete and distribute funds. Final step of the bounty flow. The bot will notify the claimer ' +
						'that the bounty is complete and review is finished. Please consider tipping the claimer for their work.',
					inline: false,
				},
				{
					name: '-> /bounty list',
					value: 'View up to 10 bounties that can either be opened, claimed by you, created by you and more.',
					inline: false,
				},
				{
					name: '-> /bounty delete ❌',
					value: 'Mark a bounty for deletion. Only drafted bounties or published bounties can be marked for deletion' +
						' by the creator of the bounty. ',
					inline: false,
				},
				{
					name: '-> Useful Links',
					value: `[Bounty Board Website](${envUrls.BOUNTY_BOARD_URL})\n` +
					'[Commands Wiki](https://bankless.notion.site/The-Bounty-Board-Commands-and-Workflow-7f15bbc3f2c744afab1cb5f90daac4a2)\n' +
					'[Feedback](https://tally.so/r/wAdey3)',
					inline: false,
				}],
		}],
	};
};