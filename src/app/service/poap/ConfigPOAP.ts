import { CommandContext, Message, MessageEmbedOptions } from 'slash-create';
import { GuildMember } from 'discord.js';

export default async (ctx: CommandContext, guildMember: GuildMember): Promise<any> => {
	// TODO: uncomment before raising PR
	// if (guildMember.guild.ownerId != guildMember.id) {
	// 	throw new ValidationError('Sorry, only the discord owner can configure poap distribution.');
	// }
	const embeds: MessageEmbedOptions[] = [];
	const intro: MessageEmbedOptions = {
		title: 'POAP Configuration',
		description: 'Welcome to POAP configuration. This is used as a first-time setup of POAP commands. These series of ' +
			'questions will help assign authorized users and roles for POAP distribution. The POAP commands allows temporary ' +
			'tracking of users who enter and exit an active voice channel. The list of users gets deleted after every /poap start ' +
			'execution.',
		footer: {
			text: '@Bankless DAO 🏴',
		},
	};
	embeds.push(intro);
	const whichRolesAreAllowedQuestion: MessageEmbedOptions = {
		title: 'Which roles are allowed?',
		description: 'Please list all of the users who are authorized to execute the poap slash commands. Users shold be ' +
			'listed with the @ handle so that discord populates it correctly. Each user should be seperated with a space.',
	};
	embeds.push(whichRolesAreAllowedQuestion);
	
	const message: Message | boolean = await ctx.send({ embeds: embeds });
	console.log(message);
	
	// if (roleId == null && userId == null) {
	// 	throw new ValidationError('Please try again and enter a discord role or user');
	// }
	return;
};
