/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { Collection, GuildMember, Role, Snowflake, MessageEmbed } from 'discord.js';
import { Client } from '@notionhq/client';
import { updateNotionGuestPassDatabase } from '../service/GuestPassService';
import constants from '../constants';
import notionPageRefs from '../api/notion/NotionGuildPages';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		console.debug('Guild member updated')
		const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
		if (removedRoles.size > 0) { 
			console.debug(`The roles ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName}.`);
			module.exports.handleRolesRemoved(newMember, removedRoles);
		}

		const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
		if (addedRoles.size > 0) {
			console.debug(`The roles ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName}.`);
			module.exports.handleRolesAdded(newMember, addedRoles);
		}
	},

	/**
	 * Handler for when roles are added to a member.
	 * 
	 * @param guildMember member that roles were added to
	 * @param roles roles that were added to member
	 */
	handleRolesAdded(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					try {
						updateNotionGuestPassDatabase(guildMember.user.tag, true);	
					} catch (e) {
						console.error(e)
					}
					break;
				case constants.DISCORD_ROLE_DEVELOPERS_GUILD:
					module.exports.sendGuildWelcomeMessage(guildMember);
					break;
			}
		})
	},

	/**
	 * Handler for when roles are removed from a member.
	 * 
	 * @param guildMember member that roles were removed from
	 * @param roles roles that were removed from member
	 */
	handleRolesRemoved(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					updateNotionGuestPassDatabase(guildMember.user.tag, false);
					break;
			}
		})
	},

	/**
	 * Sends custom welcome message on adding Developer's Guild role
	 * 
	 * @param guildMember member that has added Developer's Guild role
	 */
	async sendGuildWelcomeMessage(guildMember: GuildMember) {
		const response = await notion.databases.query({
			database_id: process.env.DEV_GUILD_PROJECTS_DATABASE_ID,
			filter: {
				property: 'Status',
				select: {
					equals: 'Active'
				}
			}
		});

		let message = '';
		message += 'Here are some resources to help you get started:\n'
		message += `[Developer\'s Guild Notion](${notionPageRefs.developers})\n`
		message += '[Bankless DAO Github](https://github.com/BanklessDAO)\n'
		message += '\n'
		message += 'Here are the projects we are working on:\n'

		response.results.forEach(result => {
			let project = result['properties']['Project']['title'][0]['text']['content'];
			let page = result['url']
			if (project && page) {
				message += `**[${project}](${page})**\n`;
			} else if (project) {
				message += `**${project}**\n`;
			} else return;

			let description = result['properties']['Description']['rich_text'][0]['text']['content'];
			if (description) {
				message += `${description}\n`;
			}

			let techStack = result['properties']['Tech Stack']['multi_select'];
			if (techStack) {
				message += `Tech Stack: `
				let length = techStack.length;
				techStack.forEach((element, index) => {
					message += element['name']
					if (index < length - 1) {
						message += ', '
					} else {
						message += '\n'
					}
				});
			}

			let githubRepo = result['properties']['Github']['rich_text'][0]['text']['content'];
			let githubLink = result['properties']['Github']['rich_text'][0]['text']['link']['url']
			if (githubRepo && githubLink) {
				message += `Github: [${githubRepo}](${githubLink})\n`;
			}

			let discordChannel = result['properties']['Discord Channel']['rich_text'][0]['text']['content'];
			let discordLink = result['properties']['Discord Channel']['rich_text'][0]['text']['link']['url']
			if (discordChannel && discordLink) {
				message += `Discord: [${discordChannel}](${discordLink})\n`;
			}

			message += '\n'
		})
		
		const embed = new MessageEmbed()
        	.setTitle('Welcome to the Developer\'s Guild!')
        	.setColor(0xF1BD1B)
        	.setDescription(message)

		guildMember.send(embed);
	}

};