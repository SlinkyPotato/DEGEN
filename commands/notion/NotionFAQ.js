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

    async run(msg, { faqQuestion }){
        const faqs = await retrieveFAQsPromise();
        console.log(faqs);
        return msg.say('');
    }
}

async function retrieveFAQsPromise() {
    console.log("calling notion APIs");
    const faqs = [];
    const numberRegex = /^[0-9]./;
    const response = await notionAPI.get(notionAPI.defaults.baseUrl + `blocks/${FAQ_PAGE_ID}/children`);
    response.data.results.forEach(obj => {
        if (obj.type === 'paragraph' && obj.paragraph.text.length > 0) {
            // Check and add question to list
            if (numberRegex.test(obj.paragraph.text[0].plain_text)) {
                faqs.push({
                    'question': obj.paragraph.text[0].plain_text,
                    'answer': ''
                });
                return;
            } else {
                // This is an answer
                const paragraphContent = obj.paragraph.text.map(element => {
                    return element.plain_text;
                }).join(" ");
                faqs[faqs.length - 1].answer += ' ' + paragraphContent;
            }
        } else if (obj.type === 'bulleted_list_item' && obj.bulleted_list_item.text.length > 0) {
            // Bulleted answers
            const bulletedContent = obj.bulleted_list_item.text.map(element => {
                return element.plain_text;
            }).join(" ");
            faqs[faqs.length - 1].answer += '\n - ' + bulletedContent;
        }
    });
    return faqs;
}