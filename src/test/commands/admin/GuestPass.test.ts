import * as sinon from 'sinon';
import assert from 'assert';
import ServiceUtils from '../../../app/utils/ServiceUtils';

const { grantGuestPass } = require('../../../app/commands/admin/GuestPass');

describe('GuestPass', () => {
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
			const serviceUtilsMock = sinon.mock(ServiceUtils);
			serviceUtilsMock.expects('getGuildAndMember').returns({
				guild: {},
				guildMember: { user: { bot: true } },
			});
			const result = await grantGuestPass(ctx);
			assert.strictEqual(result, 'Bots don\'t need a guest pass!');
		});

	});
});