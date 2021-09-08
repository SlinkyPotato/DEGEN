import { GuildMember, Message, MessageEmbedOptions } from 'discord.js';

export default async (guildMember: GuildMember, authorizedRoles?: string[], authorizedUsers?: string[]): Promise<any> => {
	// TODO: uncomment before raising PR
	// if (guildMember.guild.ownerId != guildMember.id) {
	// 	throw new ValidationError('Sorry, only the discord owner can configure poap distribution.');
	// }
	const embeds: MessageEmbedOptions[] = [];
	const intro: MessageEmbedOptions = {
		title: 'POAP Configuration',
		description: 'Welcome to POAP configuration.\n\n' +
			'This is used as a first-time setup of POAP commands. These series of ' +
			'questions will help assign authorized users and roles for POAP distribution.\n\n' +
			'These users will have access to a ' +
			'list of participants after the event has ended. They will also be able to send out mass messages to those participants.',
		footer: {
			text: '@Bankless DAO 🏴',
		},
	};
	embeds.push(intro);
	const whichRolesAreAllowedQuestion: MessageEmbedOptions = {
		title: 'Give or remove access?',
		description: 'Should the given list of users and roles be given access or remove? (give/remove)',
	};
	embeds.push(whichRolesAreAllowedQuestion);
	
	const message: Message | boolean = await guildMember.send({ embeds: embeds });
	console.log(message);
	
	// if (roleId == null && userId == null) {
	// 	throw new ValidationError('Please try again and enter a discord role or user');
	// }
	return;
};
