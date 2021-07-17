'use strict';

const chai = require('chai');
const assert = chai.assert;
const { Client } = require('@notionhq/client');
const notionFaqsCommand = require('../../../app/commands/notion/NotionFAQs.js');
const nock = require('nock');
const mockFAQsJsonResponse = require('./retrieve_faqs_mock.json');
const NotionClient = Client;
const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

describe('NotionFAQs', () => {
    before(() => {
        // const env = process.env;
        process.env = { FAQS_PAGE_ID: '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa' };
        const scope = nock('https://notion.so')
            .get(`/blocks/${process.env.FAQS_PAGE_ID}/children`)
            .reply(200, mockFAQsJsonResponse)
            .persist();
    });

    after(() => {});

    describe('Utilities Validation', () => {
        it('should be a list of 10 faqs', async () => {
            const faqs = await notionFaqsCommand.retrieveFAQsPromise();
            assert.lengthOf(faqs, 10);
        });

        it("first question should be '1. What is Bankless DAO?'", async () => {
            const faqs = await notionFaqsCommand.retrieveFAQsPromise();
            assert.equal(faqs[0].question, '1. What is Bankless DAO?');
        });
        it('first answer should be correct', async () => {
            const faqs = await notionFaqsCommand.retrieveFAQsPromise();
            assert.equal(
                faqs[0].answer,
                ' Bankless DAO is a decentralized community focused on driving adoption and awareness of bankless money systems like Ethereum, Bitcoin and DeFi. You can learn more here:  https://bankless-dao.gitbook.io/bankless-dao/starting-with-bankless-dao '
            );
        });
    });
});
