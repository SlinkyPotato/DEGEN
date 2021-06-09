const { Command } = require('discord.js-commando');
const notionAPI = require('../../api/notion/NotionAPI.js');

const FAQ_PAGE_ID = '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa';
const FAQ_URL = 'https://www.notion.so/FAQs-6a2ba0a4fd1e4381b3656ad5afd418fa';

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
                    prompt: 'Do you have a specific question? (default: no)',
                    type: 'string',
                    default: 'no'
                }
            ]
        });
    }

    async run(msg, { faqQuestion }){
        const faqs = await retrieveFAQsPromise();
        let replyStr = '**Frequently Asked Questions**: ' + FAQ_URL + ' \n\n';
        if (faqQuestion == 'n' || faqQuestion == 'no' || faqQuestion == 'nah' || faqQuestion == '') {
            // No question asked, return a few FAQs
            faqs.forEach(faq => {
                const question = '**' + faq.question + '**';
                const answer = '\n' + faq.answer.trim() + '\n';
                replyStr = replyStr + question + answer + '\n'
            });
            return msg.say(replyStr.substring(0, 2000));
        } else {
            // Try to find the answer to the given question
            const validQuestion = faqQuestion.replace(/[^\w\s]/gi, '');

            // Prepare answer
            replyStr += "Question: " + validQuestion + '\n' + 'Answer: ';

            // Search for existing question
            faqs.forEach((faq, i) => {
                const cleanQuestion = faq.question.substring(3, faq.question.length - 1);
                if (cleanQuestion === validQuestion) {
                    replyStr += faq.answer + '\n';
                    return msg.say(replyStr);
                }
            });

            // Search for close enough answer
            const words = validQuestion.split(' ');
            let highestMatchingIndex = 0;
            let highestMatchingNum = 0;
            faqs.forEach((faq, i) => {
                const cleanQuestion = faq.question.substring(3, faq.question.length - 1).toLowerCase();
                let numberOfMatches = 0;
                words.forEach(word => {
                    const cleanWord = word.toLowerCase();
                    const n = cleanQuestion.search(cleanWord);
                    if (n > 0) {
                        numberOfMatches += 1;
                    }
                });
                faq.numberOfMatches = numberOfMatches;
                if (numberOfMatches > highestMatchingNum) {
                    highestMatchingNum = numberOfMatches;
                    highestMatchingIndex = i;
                }
            });
            replyStr += faqs[highestMatchingIndex].answer + '\n';
            return msg.say(replyStr);
        }
    }
}

async function retrieveFAQsPromise() {
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