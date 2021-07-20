/**
 * Handler for Discord event `guildMemberUpdate`.
 */

import { Collection, GuildMember, Role, Snowflake } from 'discord.js';
import { Client } from '@notionhq/client';
import { updateNotionGuestPassDatabase } from '../service/GuestPassService';
import constants from '../constants';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = {
	name: 'guildMemberUpdate',
	once: false,

	async execute(oldMember: GuildMember, newMember: GuildMember) {
		console.log('Guild member updated')
		const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
		if (removedRoles.size > 0) { 
			console.log(`The roles ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName}.`);
			module.exports.handleRolesRemoved(newMember, removedRoles);
		}

		const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
		if (addedRoles.size > 0) {
			console.log(`The roles ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName}.`);
			module.exports.handleRolesAdded(newMember, addedRoles);
		}
	},

	handleRolesAdded(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					updateNotionGuestPassDatabase(guildMember.user.tag, true);	
					break;
				case constants.DISCORD_ROLE_DEVELOPERS_GUILD:
					module.exports.sendGuildWelcomeMessage(guildMember, role);
					break;
			}
		})
	},

	handleRolesRemoved(guildMember: GuildMember, roles: Collection<Snowflake, Role>) {
		roles.each(role => {
			switch (role.name) {
				case constants.DISCORD_ROLE_GUEST_PASS:
					updateNotionGuestPassDatabase(guildMember.user.tag, false);
					break;
			}
		})
	},

	async sendGuildWelcomeMessage(guildMember: GuildMember, role: Role) {
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
		
		

		console.log(response)

	}

};