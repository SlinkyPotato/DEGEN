import { SlashCommand, CommandOptionType } from 'slash-create';
import { Client as NotionClient } from '@notionhq/client';
import client from '../../app';
import { notionQueue } from '../../service/notion/NotionQueue';
const trimPageID = process.env.FAQS_PAGE_ID.replace(/-/g, '');
const FAQ_URL = `https://www.notion.so/FAQs-${trimPageID}`;
const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

module.exports = class NotionFAQs extends SlashCommand {
	constructor(creator) {
		super(creator, {
			name: 'faqs',
			description: 'Get frequently asked questions',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'question',
					description: 'Do you have a specific question?',
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
		});

		this.filePath = __filename;
	}

	async run(ctx) {
		// Ignores commands from bots
		if (ctx.user.bot) return;
		console.log('/faqs start');

		const guild = await client.guilds.fetch(ctx.guildID);
		const guildMember = await guild.members.fetch(ctx.user.id);

		const faqs = await module.exports.retrieveFAQsPromise();
		const faqQuestion = String(ctx.options.question);
		let replyStr = '**Frequently Asked Questions**: ' + FAQ_URL + ' \n\n';
		if (
			faqQuestion === 'n' ||
            faqQuestion === 'no' ||
            faqQuestion === 'nah' ||
            faqQuestion === '' ||
            faqQuestion === 'undefined'
		) {
			// No question asked, return a few FAQs
			faqs.forEach((faq) => {
				const question = '**' + faq.question + '**';
				const answer = '\n' + faq.answer.trim() + '\n';
				replyStr = replyStr + question + answer + '\n';
			});
			ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
			return guildMember.send(replyStr.substring(0, 1950));
		} else {
			// Try to find the answer to the given question
			const validQuestion = faqQuestion.replace(/[^\w\s]/gi, '');

			// Prepare answer
			replyStr += 'Question: ';

			// Search for existing question
			for (let i = 0; i++; i < faqs.length) {
				const cleanQuestion = faqs.question.substring(3, faqs.question.length - 1);
				if (cleanQuestion === validQuestion) {
					replyStr += cleanQuestion + '\n' + 'Answer: ' + faqs.answer + '\n';
					return ctx.send(replyStr);
				}
			}
			// Search for close enough answer
			const words = validQuestion.split(' ');
			let highestMatchingIndex = 0;
			let highestMatchingNum = 0;
			faqs.forEach((faq, i) => {
				const cleanQuestion = faq.question
					.substring(3, faq.question.length - 1)
					.toLowerCase();
				let numberOfMatches = 0;
				words.forEach((word) => {
					const cleanWord = word.toLowerCase();
					const isIncluded = cleanQuestion
						.split(' ')
						.includes(cleanWord);
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
			replyStr +=
                faqs[highestMatchingIndex].question +
                '\n' +
                'Answer: ' +
                faqs[highestMatchingIndex].answer +
                '\n';
			return ctx.send(replyStr.substring(0, 1950));
		}
	}
};

module.exports.retrieveFAQsPromise = async (): Promise<Array<any>> => {
	const faqs = [];
	const numberRegex = /^[0-9]./;
	const response = await notionQueue.add(() => notion.blocks.children.list({
		block_id: process.env.FAQS_PAGE_ID,
	}));
	response.results.forEach((obj) => {
		if (obj.type === 'paragraph' && obj.paragraph.text.length > 0) {
			// Check and add question to list
			if (numberRegex.test(obj.paragraph.text[0].plain_text)) {
				faqs.push({
					question: obj.paragraph.text[0].plain_text,
					answer: '',
				});
				return;
			} else {
				// This is an answer
				const paragraphContent = obj.paragraph.text
					.map((element) => {
						return element.plain_text;
					})
					.join(' ');
				faqs[faqs.length - 1].answer += ' ' + paragraphContent;
			}
		} else if (
			obj.type === 'bulleted_list_item' &&
            obj.bulleted_list_item.text.length > 0
		) {
			// Bulleted answers
			const bulletedContent = obj.bulleted_list_item.text
				.map((element) => {
					return element.plain_text;
				})
				.join(' ');
			faqs[faqs.length - 1].answer += '\n - ' + bulletedContent;
		}
	});
	return faqs;
};