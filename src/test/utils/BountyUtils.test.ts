import BountyUtils from '../../app/utils/BountyUtils';

describe('BountyUtils', () => {
	let guildMember;

	beforeEach(() => {
		guildMember = {
			send: (message: string) => { return message; },
			user: {
				id: '567865362541182987',
			},
		};
	});

	describe('BountyId Validation', () => {

		it('should be valid for string', () => {
			try {
				BountyUtils.validateBountyId(guildMember, '60f8492fa6a710dbb50b8b7d');
				expect(true).toStrictEqual(true);
			} catch (e) {
				expect(true).toStrictEqual(false);
			}
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyId(guildMember, null);
				expect(false).toStrictEqual(true);
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bountyId.');
			}
		});

		it('should be invalid for special characters', async () => {
			try {
				await BountyUtils.validateBountyId(guildMember, '!!!!');
				expect(false).toStrictEqual(true);
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bountyId.');
			}
		});
	});

	describe('BountyType Validation', () => {
		it('should be valid for uppercase string', async () => {
			await BountyUtils.validateBountyType(guildMember, 'OPEN');
			expect(true).toStrictEqual(true);
		});

		it('should be invalid for lowercase string', async () => {
			try {
				await BountyUtils.validateBountyType(guildMember, 'open');
				expect(false).toStrictEqual(true);
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bounty type.');
			}
		});

		it('should be invalid for null', async () => {
			try {
				await BountyUtils.validateBountyType(guildMember, null);
				expect(false).toStrictEqual(true);
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bounty type.');
			}
		});
	});
});