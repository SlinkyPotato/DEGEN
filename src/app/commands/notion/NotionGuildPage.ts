import { SlashCommand, CommandOptionType, CommandContext, SlashCreator } from 'slash-create';
import notionPageRefs from '../../service/notion/NotionGuildPages';
import discordServerIds from '../../service/constants/discordServerIds';
import { LogUtils } from '../../utils/Log';

export default class NotionGuildPage extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'notion',
			description: 'View a Guild\'s notion page',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
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
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		// Ignores commands from bots
		if (ctx.user.bot) return;
		const guild = String(ctx.options.guild).toLowerCase();
		const page = notionPageRefs[guild];
		await ctx.send(`Here you are ${ctx.user.mention}, the ${ctx.options.guild} Guild Notion Page: ${page}`);
	}
}