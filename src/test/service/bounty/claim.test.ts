import * as chai from 'chai';
import claim from '../../../app/service/bounty/claim';
import * as sinon from 'sinon';
import db from '../../../app/db/db';
import { MongoClient, MongoError } from 'mongodb';
import serviceUtils from '../../../app/service/ServiceUtils';

const assert = chai.assert;

describe('BountyClaimTest', () => {
	let ctx;

	beforeEach(() => {
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

		const stub = sinon.stub(serviceUtils, 'getGuildMember');
		stub.returns({ send: (message) => { return message; } });
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Parameter Validation', () => {

		it('should be invalid bountyId', async function() {
			ctx.options.claim['bounty-id'] = null;
			const result = await claim(ctx);
			assert.equal(result, '<@567865362541182987>\n' +
			'Please enter a valid bounty hash ID: \n' +
			' - can be found on bountyboard website\n' +
			' - https://bankless.community');
		});

	});

	describe('Connection Errors', () => {
		it('should be mongodb error', async () => {

			const mock = sinon.mock(MongoClient);
			mock.expects('connect').once().throws('bad connection');

			const result = await (await claim(ctx));

			assert.equal(result, 'Sorry something is not working, our devs are looking into it.');
		});

	});
});