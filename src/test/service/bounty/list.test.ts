import * as chai from 'chai';
import * as sinon from 'sinon';
import list from '../../../app/service/bounty/list';
import ServiceUtils from '../../../app/utils/ServiceUtils';

const assert = chai.assert;

describe('BountyList', () => {
	let ctx;
	let serviceUtilsMock;

	beforeEach(() => {
		ctx = {
			user: {
				bot: null,
				id: '0000000',
			},
			options: {
				list: {
					'list-type': 'open',
				},
			},
			send: (message: string) => { return message; },
		};

		serviceUtilsMock = sinon.mock(ServiceUtils);
		serviceUtilsMock.expects('getGuildAndMember').returns({
			guild: {},
			guildMember: { send: (message) => { return message; } },
		});
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('Parameter Validation', () => {

		it('should be invalid bounty-type', async function() {
			ctx.options.list['list-type'] = 'sadfasdfsdaf';
			try {
				await list(ctx);
			} catch (e) {
				console.log(e);
				assert.equal(e.message, 'invalid bounty type');
			}
		});
	});

});