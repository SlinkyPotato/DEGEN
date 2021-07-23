import * as chai from 'chai';
import * as sinon from 'sinon';
import list from '../../../app/service/bounty/list';
import serviceUtils from '../../../app/service/ServiceUtils';

const assert = chai.assert;

describe('BountyList', () => {
	let ctx;
	let serviceUtilsStub;

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

		serviceUtilsStub = sinon.stub(serviceUtils, 'getGuildMember');
		serviceUtilsStub.returns({ send: (message) => { return message; } });
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