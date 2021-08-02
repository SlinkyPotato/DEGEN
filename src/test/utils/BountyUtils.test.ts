import BountyUtils from '../../app/utils/BountyUtils';
import * as sinon from 'sinon';
import * as chai from 'chai';

const assert = chai.assert;

describe('BountyUtils', () => {
	let ctx;
	let guildMember;

	beforeEach(() => {
		ctx = {
			user: {
				bot: null,
				id: '567865362541182987',
				mention: 'George',
			},
			send: (message: string) => { return message; },
		};
		guildMember = {
			send: (message: string) => { return message; },
		};
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('BountyId Validation', () => {

		it('should be valid for string', () => {
			try {
				BountyUtils.validateBountyId(guildMember, '60f8492fa6a710dbb50b8b7d');
				assert.equal(true, true);
			} catch (e) {
				assert.equal(true, false);
			}
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyId(guildMember, null);
				assert.equal(false, true);
			} catch (e) {
				assert.equal(e.message, 'invalid bountyId');
			}
		});

		it('should be invalid for special characters', async () => {
			try {
				await BountyUtils.validateBountyId(guildMember, '!!!!');
				assert.equal(false, true);
			} catch (e) {
				assert.equal(e.message, 'invalid bountyId');
			}
		});
	});

	describe('BountyType Validation', () => {
		it('should be valid for uppercase string', async () => {
			await BountyUtils.validateBountyType(guildMember, 'OPEN');
			assert.equal(true, true);
		});

		it('should be invalid for lowercase string', async () => {
			try {
				await BountyUtils.validateBountyType(guildMember, 'open');
				assert.equal(false, true);
			} catch (e) {
				assert.equal(e.message, 'invalid bounty type');
			}
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyType(guildMember, null);
				assert.equal(false, true);
			} catch (e) {
				assert.equal(e.message, 'invalid bounty type');
			}
		});
	});
});