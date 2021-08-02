import * as sinon from 'sinon';
import assert from 'assert';
import client from '../../../app/app';
import AddGuestPass from '../../../app/service/guest-pass/AddGuestPass';

describe('GuestPass', () => {
	let ctx;
	let guestUser;

	beforeEach(() => {
		// ctx = {
		// 	guildId: '345345345345345345',
		// 	options: {
		// 		user: {
		// 			bot: null,
		// 			id: '567865362541182987',
		// 		},
		// 	},
		// 	send: (message: string) => {
		// 		return message;
		// 	},
		// };
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

			const result = await AddGuestPass(guestUser);
			assert.strictEqual(result, 'Bots don\'t need a guest pass!');
		});

	});
});