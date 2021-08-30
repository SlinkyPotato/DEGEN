import { Client as NotionClient } from '@notionhq/client';
import { notionQueue } from './NotionQueue';
const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

export default async (): Promise<Array<any>> => {
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