import assert from 'assert';
import RetrieveFAQs from '../../../app/service/notion/RetrieveFAQs';
import { notionQueue } from '../../../app/service/notion/NotionQueue';
import * as mockFaqs from './retrieve_faqs_mock.json';

jest.mock('../../../app/service/notion/NotionQueue');

describe('RetrieveFAQs', () => {
	beforeAll(() => {
		notionQueue.add = jest.fn().mockReturnValue(Promise.resolve(mockFaqs));
	});

	it('should be a list of 10 faqs', async () => {
		const faqs = await RetrieveFAQs();
		assert.strictEqual(faqs.length, 10);
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
