const { Command } = require('discord.js-commando');
// const notion = require('../../notion/Notion.js');
const notionAPI = require('../../notion/NotionAPI.js');

const FAQ_PAGE_ID = '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa';

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
        const blocks = retrieveFAQ();
        return msg.say('PASSING IT BACK: ' + faqQuestion);
    }
}

function retrieveFAQ() {
    console.log("calling notion APIs");
    const blocks = notionAPI.get(notionAPI.defaults.baseUrl + `blocks/${FAQ_PAGE_ID}/children`);
    blocks.catch(errors => {
        console.log(errors);
    }).then(response => {
        console.log(response);
    });
    return blocks;
}