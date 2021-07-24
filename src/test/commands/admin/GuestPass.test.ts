import * as sinon from 'sinon';
import assert from 'assert';
import client from '../../../app/app';

const { grantGuestPass } = require('../../../app/commands/admin/GuestPass');

describe('GuestPass', () => {
	let ctx;

	beforeEach(() => {
		ctx = {
			guildId: '345345345345345345',
			options: {
				user: {
					bot: null,
					id: '567865362541182987',
				},
			},
			send: (message: string) => {
				return message;
			},
		};
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('User Object Validation', () => {

		it('should be invalid for bot user', async () => {
			const clientMock = sinon.mock(client.guilds);
			clientMock.expects('fetch').returns({
				members: {
					fetch: (_: string) => {
						return { user: { bot: true } };
					},
				},
			});

			const result = await grantGuestPass(ctx);
			assert.strictEqual(result, 'Bots don\'t need a guest pass!');
		});

	});
});