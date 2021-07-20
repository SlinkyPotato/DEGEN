import * as chai from 'chai';
import claim from '../../../app/service/bounty/claim';

const assert = chai.assert;

describe('BountyTest', () => {
	let ctx;

	before(() => {
		ctx = {
			user: {
				bot: null,
				id: '567865362541182987',
			},
			options: {
				claim: {
					'bounty-id': '60f4af1ab8b8be734402b29b',
				},
			},
			send: (message: string) => { return message; },
		};
	});

	describe('ClaimTest', () => {

		it('should be invalid bountyId', async function() {
			ctx.options.claim['bounty-id'] = null;
			const result = await claim(ctx);
			console.log(result);
			assert.equal(result, '<@567865362541182987>\n' +
			'Please enter a valid bounty hash ID: \n' +
			' - can be found on bountyboard website\n' +
			' - https://bankless.community');
		});
	});
});