import { SlashCommand, CommandOptionType } from 'slash-create';
import notionPageRefs from '../../api/notion/NotionGuildPages';

module.exports = class NotionGuildPage extends SlashCommand {
	constructor(creator) {
		super(creator, {
			name: 'notion',
			description: 'View a Guild\'s notion page',
			guildIDs: process.env.DISCORD_SERVER_ID,
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'guild',
					description: 'Select a guild',
					required: true,
					choices: [
						{
							name: 'analytics',
							value: 'Analytics',
						},
						{
							name: 'av',
							value: 'AV',
						},
						{
							name: 'bizdev',
							value: 'Bizdev',
						},
						{
							name: 'design',
							value: 'Design',
						},
						{
							name: 'developers',
							value: 'Developers',
						},
						{
							name: 'education',
							value: 'Education',
						},
						{
							name: 'legal',
							value: 'legal',
						},
						{
							name: 'marketing',
							value: 'Marketing',
						},
						{
							name: 'operations',
							value: 'Operations',
						},
						{
							name: 'research',
							value: 'Research',
						},
						{
							name: 'translators',
							value: 'Translators',
						},
						{
							name: 'treasury',
							value: 'Treasury',
						},
						{
							name: 'writers',
							value: 'Writers',
						},
					],
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
		console.log('/notion start');
		const guild = String(ctx.options.guild).toLowerCase();
		const page = notionPageRefs[guild];
		console.log('/notion end');
		return `Here you are ${ctx.user.mention}, the ${ctx.options.guild} Guild Notion Page: ${page}`;
	}
};