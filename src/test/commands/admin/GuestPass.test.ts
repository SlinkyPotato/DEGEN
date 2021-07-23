import * as chai from 'chai';
import * as sinon from 'sinon';

const assert = chai.assert;

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
			send: (message: string) => { return message; },
		};
	});

	afterEach(() => {
		sinon.restore();
	});

});