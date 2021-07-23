import assert from 'assert';

const notionFaqsCommand = require('../../../app/commands/notion/NotionFAQs');
const nock = require('nock');
import * as mockFAQsJsonResponse from './retrieve_faqs_mock.json';

describe('NotionFAQs', () => {
	before(() => {
		// const env = process.env;
		process.env = { FAQS_PAGE_ID: '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa' };
		nock('https://api.notion.com/v1')
			.get(`/blocks/${process.env.FAQS_PAGE_ID}/children`)
			.reply(200, mockFAQsJsonResponse)
			.persist();
	});

	describe('Utilities Validation', () => {
		it('should be a list of 10 faqs', async () => {
			const faqs = await notionFaqsCommand.retrieveFAQsPromise();
			assert.strictEqual(faqs.length, 10);
		});

		it('first question should be \'1. What is Bankless DAO?\'', async () => {
			const faqs = await notionFaqsCommand.retrieveFAQsPromise();
			assert.strictEqual(faqs[0].question, '1. What is Bankless DAO?');
		});
		it('first answer should be correct', async () => {
			const faqs = await notionFaqsCommand.retrieveFAQsPromise();
			assert.strictEqual(
				faqs[0].answer,
				' Bankless DAO is a decentralized community focused on driving adoption and awareness of bankless money systems like Ethereum, Bitcoin and DeFi. You can learn more here:  https://bankless-dao.gitbook.io/bankless-dao/starting-with-bankless-dao ',
			);
		});
	});
});
