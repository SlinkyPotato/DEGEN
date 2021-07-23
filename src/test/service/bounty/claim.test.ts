import * as chai from 'chai';
import claim from '../../../app/service/bounty/claim';
import * as sinon from 'sinon';
import { MongoClient } from 'mongodb';
import serviceUtils from '../../../app/utils/ServiceUtils';
import { DiscordAPIError } from 'discord.js';

const assert = chai.assert;

describe('BountyClaim', () => {
	let ctx;
	let serviceUtilsStub;

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

		serviceUtilsStub = sinon.stub(serviceUtils, 'getGuildMember');
		serviceUtilsStub.returns({ send: (message) => { return message; } });
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Parameter Validation', () => {

		it('should be invalid bountyId for null', async function() {
			ctx.options.claim['bounty-id'] = null;

			try {
				await claim(ctx);
			} catch (e) {
				assert.equal(e.message, 'invalid bountyId');
			}
		});

		it('should be invalid bountyId full special character', async function() {
			ctx.options.claim['bounty-id'] = '$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$';
			try {
				await claim(ctx);
			} catch (e) {
				assert.equal(e.message, 'invalid bountyId');
			}
		});

		it('should be invalid bountyId full negative numbers', async function() {
			ctx.options.claim['bounty-id'] = '-10005';
			try {
				await claim(ctx);
			} catch (e) {
				assert.equal(e.message, 'invalid bountyId');
			}
		});

	});

	describe('Connection Errors', () => {
		it('should be mongodb error', async () => {

			const mock = sinon.mock(MongoClient);
			mock.expects('connect').once().throws('bad connection');
			const result = await (await claim(ctx));

			assert.equal(result, 'Sorry something is not working, our devs are looking into it.');
		});

		it('should be client api error', async () => {
			serviceUtilsStub.restore();

			const mock = sinon.mock(serviceUtils);
			mock.expects('getGuildMember').once().throws(new DiscordAPIError('', new Error('Mock Discord API Error'), 'GET', 405));

			try {
				await (await claim(ctx));
			} catch (e) {
				assert.equal(e.message, 'Mock Discord API Error');
			}
		});

	});
});