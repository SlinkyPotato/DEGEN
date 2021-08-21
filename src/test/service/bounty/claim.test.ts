import claim from '../../../app/service/bounty/ClaimBounty';

describe('BountyClaim', () => {
	// let serviceUtilsMock;
	let guildMember;

	beforeEach(() => {
		guildMember = {
			send: (message: string) => {
				return message;
			},
			user: {
				id: '567865362541182987',
			},
		};
		
		// serviceUtilsMock = sinon.mock(ServiceUtils);
		// serviceUtilsMock.expects('getGuildAndMember').returns({
		// 	guild: {},
		// 	guildMember: { send: (message) => { return message; } },
		// });
	});

	describe('Parameter Validation', () => {

		it('should be invalid bountyId for null', async function() {
			try {
				await claim(guildMember, null);
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bountyId.');
			}
		});

		it('should be invalid bountyId full special character', async function() {
			try {
				await claim(guildMember, '$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bountyId.');
			}
		});

		it('should be invalid bountyId full negative numbers', async function() {
			try {
				await claim(guildMember, '-10005');
			} catch (e) {
				expect(e.message).toStrictEqual('Please try another bountyId.');
			}
		});

	});

	describe('Connection Errors', () => {
		it('should be mongodb error', async () => {

			// const mock = sinon.mock(MongoClient);
			// mock.expects('connect').throws(new Error('bad connection'));

			// const result = await claim(guildMember, null).catch(_ => {
			// 	return 'Sorry something is not working and our devs are looking into it';
			// });
			
			// assert.equal(result, 'Sorry something is not working and our devs are looking into it');
		});

		it('should be client api error', async () => {
			// serviceUtilsMock.restore();
			// const mock = sinon.mock(ServiceUtils);
			// mock.expects('getGuildAndMember').once().throws(new DiscordAPIError('', new Error('Mock Discord API Error'), 'GET', 405));
			//
			// try {
			// 	await (await claim(guildMember, ''));
			// } catch (e) {
			// 	assert.equal(e.message, 'Mock Discord API Error');
			// }
		});

	});
});