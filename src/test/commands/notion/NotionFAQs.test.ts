
import assert from 'assert';
import RetrieveFAQs from '../../../app/service/notion/RetrieveFAQs';
jest.mock('../../../app/service/notion/RetrieveFAQs')

describe('NotionFAQs', () => {
	beforeEach(() => {
		process.env = { FAQS_PAGE_ID: 'f99e764c-9eb7-4d87-bfc7-fcd93fa93df5' };
	});

	describe('Utilities Validation', () => {

		it('should be disabled', () => {
			assert.strictEqual(false, false);
		});

		it('should be a list of 21 faqs', async () => {
			const faqs = await RetrieveFAQs();
			assert.strictEqual(faqs.length, 21);
		});
		
		it('first question should be \'1. What is Bankless DAO?\'', async () => {
			const faqs = await RetrieveFAQs();
			assert.strictEqual(faqs[0].question, '1. What is Bankless DAO?');
		});

		it('first answer should be correct', async () => {
			const faqs = await RetrieveFAQs();
			assert.strictEqual(
				faqs[0].answer,
				' Bankless DAO is a decentralized community focused on driving adoption and awareness of bankless money systems like Ethereum, Bitcoin and DeFi. You can learn more here:  https://bankless-dao.gitbook.io/bankless-dao/starting-with-bankless-dao ',
			);
		});
	});
});
