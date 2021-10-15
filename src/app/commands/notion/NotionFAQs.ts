import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
import client from '../../app';
import RetrieveFAQs from '../../service/notion/RetrieveFAQs';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';
const trimPageId = process.env.FAQS_PAGE_ID.replace(/-/g, '');
const FAQ_URL = `https://www.notion.so/FAQs-${trimPageId}`;

export default class NotionFAQs extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'faqs',
			description: 'Get frequently asked questions',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
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
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		// Ignores commands from bots
		if (ctx.user.bot) return;

		try {
			const guild = await client.guilds.fetch(ctx.guildID);
			const guildMember = await guild.members.fetch(ctx.user.id);

			const faqs = await RetrieveFAQs();
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
					const cleanQuestion = faqs['question'].substring(3, faqs['question'].length - 1);
					if (cleanQuestion === validQuestion) {
						replyStr += cleanQuestion + '\n' + 'Answer: ' + faqs['answer'] + '\n';
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
		} catch (e) {
			LogUtils.logError('error occurred with notion FAQs', e);
		}
	}
}