import AddGuestPass from '../../../app/service/guest-pass/AddGuestPass';

describe('GuestPass', () => {
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

	describe('Connection Error', () => {

		it('should be invalid Mongo DB connection', async () => {
			// jest.mock('mongodb');
			// const mockedMongoClient = jest.mock('MongoClient');
			// const mockedMongoClient = mocked(MongoClient, true);
			// mockedMongoClient.mockImplementation(() => {
			// 	throw new Error('Bad connection');
			// });
			//
			// const clientMock = sinon.mock(client.guilds);
			// clientMock.expects('fetch').returns({
			// 	members: {
			// 		fetch: (_: string) => {
			// 			return { user: { bot: true } };
			// 		},
			// 	},
			// });

			// const result = await AddGuestPass(guestUser);
			// expect(result.message).toStrictEqual('Bad Connection');
			// assert.strictEqual(result, 'Bots don\'t need a guest pass!');
		});

	});
});