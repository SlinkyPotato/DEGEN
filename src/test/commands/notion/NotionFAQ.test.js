'use strict';

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const notionAPI = require('../../../app/api/notion/NotionAPI.js');
const notionFaqsCommand = require('../../../app/commands/notion/NotionFAQs.js');
const nock = require('nock');
const mockFAQsJsonResponse = require('./retrieve_faqs_mock.json');
const path = require('path');

// Discord mocks
const {
	Message,
	Guild,
	TextChannel
} = require('../../utils/discord-mocks');

const Discord = require('discord.js');
const { CommandoClient } = require('discord.js-commando');

describe('NotionFAQs', () => {
    before(() => {
        const env = process.env;
        process.env = { FAQS_PAGE_ID: '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa' };
        const scope = nock(notionAPI.defaults.baseUrl)
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

describe('Discord client $notion-faq', () => {

	const client = new CommandoClient({
		commandPrefix: '$',
		owner: process.env.DISCORD_OWNER_ID,
	});
	const guild = new Guild(client);
	const channel = new TextChannel(guild);

	client.registry
	.registerDefaultTypes()
	.registerGroups([
		['admin', 'Commands for admin automation'],
		['notion', 'Commands for interacting with the Notion API'],
	])
	.registerDefaultGroups()
	.registerDefaultCommands()
	.registerCommandsIn(path.join(__dirname, '../../../app/commands'));

	const testUser = {
		id: Discord.SnowflakeUtil.generate(),
		username: 'username',
		discriminator: '123'
	}

	const command = client.registry.groups.get('notion').commands.get('notion-faqs').run;

	before(() => {});

	after(() => {
		client.destroy();
	});

	it('reply with the answer if I query a specific question', async () => {

		await command(new Message('$notion-faq', channel, testUser), { faqQuestion: 'how can I contribute?'});
		expect(channel.lastMessage.content).contains("Share your skills and step up");

	});

	it('The bot will send a DM if I just call the command', async () => {
		await command(new Message('$notion-faq', channel, testUser), { faqQuestion: ''});
		expect(channel.lastMessage.content).contains("Share your skills and step up")
	});

});
