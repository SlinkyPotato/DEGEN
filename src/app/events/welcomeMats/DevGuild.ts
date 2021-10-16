import { GuildMember, MessageEmbed } from 'discord.js';
import { Client } from '@notionhq/client';
import notionPageRefs from '../../service/notion/NotionGuildPages';
import { notionQueue } from '../../service/notion/NotionQueue';
import { LogUtils } from '../../utils/Log';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Sends custom welcome message on adding Developer's Guild role
 * 
 * @param guildMember member that has added Developer's Guild role
 */
export default async function sendGuildWelcomeMessage(guildMember: GuildMember): Promise<any> {
	const response = await notionQueue.add(() => notion.databases.query({
		database_id: process.env.NOTION_DEV_GUILD_PROJECTS_DATABASE_ID,
		filter: {
			property: 'Status',
			select: {
				equals: 'Active',
			},
		},
	}));

	let message = '';
	message += 'Here are some resources to help you get started:\n';
	message += `[Developer's Guild Notion](${notionPageRefs.developers})\n`;
	message += '[Bankless DAO Github](https://github.com/BanklessDAO)\n';
	message += '\n';
	message += 'Here are the projects we are working on:\n';

	response.results.forEach(result => {
		try {
			const project = result['properties']['Project']['title'][0]['text']['content'];
			const page = result['url'];
			if (project && page) {
				message += `**[${project}](${page})**\n`;
			} else if (project) {
				message += `**${project}**\n`;
			} else {
				return;
			}
		} catch (err) {
			LogUtils.logError('failed to process welcome mat properties project', err);
			return;
		}

		try {
			const description = result['properties']['Summary']['rich_text'][0]['text']['content'];
			if (description) {
				message += `${description}\n`;
			}
		} catch (err) {
			LogUtils.logError('failed to process welcome mat properties summary', err);
		}

		try {
			const techStack = result['properties']['Tech Stack']['multi_select'];
			if (techStack) {
				message += 'Tech Stack: ';
				const length = techStack.length;
				techStack.forEach((element, index) => {
					message += element['name'];
					if (index < length - 1) {
						message += ', ';
					} else {
						message += '\n';
					}
				});
			}
		} catch (err) {
			LogUtils.logError('failed to process welcome mat properties tech stack', err);
		}

		try {
			const githubRepo = result['properties']['Github']['rich_text'][0]['text']['content'];
			const githubLink = result['properties']['Github']['rich_text'][0]['text']['link']['url'];
			if (githubRepo && githubLink) {
				message += `Github: [${githubRepo}](${githubLink})\n`;
			}
		} catch (err) {
			LogUtils.logError('failed to process welcome mat properties github', err);
		}

		try {
			const discordChannel = result['properties']['Discord Channel']['rich_text'][0]['text']['content'];
			const discordLink = result['properties']['Discord Channel']['rich_text'][0]['text']['link']['url'];
			if (discordChannel && discordLink) {
				message += `Discord: [${discordChannel}](${discordLink})\n`;
			}
		} catch (err) {
			LogUtils.logError('failed to process welcome mat discord channel', err);
		}

		message += '\n';
	});
    
	const embed = new MessageEmbed()
		.setTitle('Welcome to the Developer\'s Guild!')
		.setColor(0xF1BD1B)
		.setDescription(message);

	return guildMember.send({ embeds: [embed] });
}