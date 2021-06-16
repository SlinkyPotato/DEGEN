const { Command } = require('discord.js-commando');
const notionAPI = require('../../api/notion/NotionAPI.js');

const trimPageID = process.env.FAQS_PAGE_ID.replace(/-/g, '');
const FAQ_URL = `https://www.notion.so/FAQs-${trimPageID}`;

module.exports = class NotionCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'notion-faqs',
            aliases: ['notionfaqs'],
            group: 'notion',
            memberName: 'notion-faqs',
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
        const faqs = await module.exports.retrieveFAQsPromise();
        let replyStr = '**Frequently Asked Questions**: ' + FAQ_URL + ' \n\n';
        if (faqQuestion === 'n' || faqQuestion === 'no' || faqQuestion === 'nah' || faqQuestion === '') {
            // No question asked, return a few FAQs
            faqs.forEach(faq => {
                const question = '**' + faq.question + '**';
                const answer = '\n' + faq.answer.trim() + '\n';
                replyStr = replyStr + question + answer + '\n'
            });
            msg.reply('Sent you a DM with information.');
            return msg.author.send(replyStr.substring(0, 1950));
        } else {
            // Try to find the answer to the given question
            const validQuestion = faqQuestion.replace(/[^\w\s]/gi, '');

            // Prepare answer
            replyStr += "Question: ";

            // Search for existing question
            for (let i = 0; i++; i < faqs.length) {
                const cleanQuestion = faqs.question.substring(3, faqs.question.length - 1);
                if (cleanQuestion === validQuestion) {
                    replyStr += cleanQuestion + '\n' + 'Answer: ' + faqs.answer + '\n';
                    return msg.say(replyStr);
                }
            }
            // Search for close enough answer
            const words = validQuestion.split(' ');
            let highestMatchingIndex = 0;
            let highestMatchingNum = 0;
            faqs.forEach((faq, i) => {
                const cleanQuestion = faq.question.substring(3, faq.question.length - 1).toLowerCase();
                let numberOfMatches = 0;
                words.forEach(word => {
                    const cleanWord = word.toLowerCase();
                    const isIncluded = cleanQuestion.split(" ").includes(cleanWord);
                    if (isIncluded) {
                        numberOfMatches += 1;
                    }
                });
                faq.numberOfMatches = numberOfMatches;
                if (numberOfMatches > highestMatchingNum) {
                    highestMatchingNum = numberOfMatches;
                    highestMatchingIndex = i;
                }
            });
            replyStr += faqs[highestMatchingIndex].question + '\n' + 'Answer: ' + faqs[highestMatchingIndex].answer + '\n';
            return msg.say(replyStr);
        }
    }
}

module.exports.retrieveFAQsPromise = async function() {
    const faqs = [];
    const numberRegex = /^[0-9]./;
    const response = await notionAPI.get(notionAPI.defaults.baseUrl + `blocks/${process.env.FAQS_PAGE_ID}/children`);
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
