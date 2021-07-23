import BountyUtils from '../../../app/service/bounty/BountyUtils';
import assert from 'assert';

describe('BountyUtils', () => {
	let ctx;
	let guildMember;

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
		guildMember = {
			send: (message: string) => { return message; },
		};
	});

	describe('BountyId Validation', () => {

		it('should be valid for string', () => {
			BountyUtils.validateBountyId(ctx, guildMember, '60f8492fa6a710dbb50b8b7d');
			assert.strictEqual(true, true);
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyId(ctx, guildMember, null);
				assert.strictEqual(false, true);
			} catch (e) {
				assert.strictEqual(e.message, 'invalid bountyId');
			}
		});
		it('should be invalid for special characters', async () => {
			try {
				await BountyUtils.validateBountyId(ctx, guildMember, '@#$#@$%&(*#@$&*(%&%f$');
				assert.strictEqual(false, true);
			} catch (e) {
				assert.strictEqual(e.message, 'invalid bountyId');
			}
		});
	});

	describe('BountyType Validation', () => {
		it('should be valid for uppercase string', async () => {
			await BountyUtils.validateBountyType(ctx, guildMember, 'OPEN');
			assert.strictEqual(true, true);
		});

		it('should be invalid for lowercase string', async () => {
			try {
				await BountyUtils.validateBountyType(ctx, guildMember, 'open');
				assert.strictEqual(false, true);
			} catch (e) {
				assert.strictEqual(e.message, 'invalid bounty type');
			}
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyType(ctx, guildMember, 'null');
				assert.strictEqual(false, true);
			} catch (e) {
				assert.strictEqual(e.message, 'invalid bounty type');
			}
		});
	});
});