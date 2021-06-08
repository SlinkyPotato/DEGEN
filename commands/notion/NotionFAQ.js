const { Command } = require('discord.js-commando');
const notion = require('../../notion/Notion.js');

module.exports = class NotionCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'notion-faq',
            aliases: ['notionfaq'],
            group: 'notion',
            memberName: 'notion-faq',
            description: 'Get answers to commonly asked questions.',
            args: [
                {
                    key: 'faqQuestion',
                    prompt: 'Send your question and see if we can find an answer!',
                    type: 'string'
                }
            ]
        });
    }

    run(msg, { faqQuestion }) {
        return msg.say('PASSING IT BACK: ' + faqQuestion);
    }
}