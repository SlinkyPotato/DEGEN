// import BountyUtils from '../../app/utils/BountyUtils';
// import exp from 'constants';

describe('BountyUtils', () => {
	// let guildMember;

	beforeEach(() => {
		// guildMember = {
		// 	send: (message: string) => { return message; },
		// 	user: {
		// 		id: '567865362541182987',
		// 	},
		// };
	});

	describe('blank', () => {
		it('nothing', () => { expect(true).toStrictEqual(true); });
	});

	// describe('BountyId Validation', () => {
	//
	// 	it('should be valid for string', () => {
	// 		try {
	// 			BountyUtils.validateBountyId(guildMember, '60f8492fa6a710dbb50b8b7d').catch();
	// 			expect(true).toStrictEqual(true);
	// 		} catch (e) {
	// 			expect(true).toStrictEqual(false);
	// 		}
	// 	});
	//
	// 	it('should be invalid for null', async () => {
	// 		try {
	// 			await BountyUtils.validateBountyId(guildMember, null).catch();
	// 			expect(false).toStrictEqual(true);
	// 		} catch (e) {
	// 			expect(e.message).toStrictEqual('Please try another bountyId.');
	// 		}
	// 	});
	//
	// 	it('should be invalid for special characters', async () => {
	// 		try {
	// 			await BountyUtils.validateBountyId(guildMember, '!!!!').catch();
	// 			expect(false).toStrictEqual(true);
	// 		} catch (e) {
	// 			expect(e.message).toStrictEqual('Please try another bountyId.');
	// 		}
	// 	});
	// });

	describe('BountyType Validation', () => {
		// it('should be valid for uppercase string', async () => {
		//
		//
		// 	try {
		// 		await BountyUtils.validateBountyType(guildMember, 'OPEN');
		// 	} catch (e) {
		// 		// console.log(e);
		// 		expect(e.message).toStrictEqual('Please try another bounty type.');
		// 	}
		// });

		// it('should be invalid for lowercase string', async () => {
		// 	try {
		// 		await BountyUtils.validateBountyType(guildMember, 'open').catch();
		// 		expect(false).toStrictEqual(true);
		// 	} catch (e) {
		// 		expect(e.message).toStrictEqual('Please try another bounty type.');
		// 	}
		// });
		//
		// it('should be invalid for null', async () => {
		// 	try {
		// 		await BountyUtils.validateBountyType(guildMember, null).catch();
		// 		expect(false).toStrictEqual(true);
		// 	} catch (e) {
		// 		expect(e.message).toStrictEqual('Please try another bounty type.');
		// 	}
		// });
	});
});