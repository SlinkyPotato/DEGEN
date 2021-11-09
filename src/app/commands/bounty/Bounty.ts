import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ValidationError from '../../errors/ValidationError';
import DeleteBounty from '../../service/bounty/DeleteBounty';
import ServiceUtils from '../../utils/ServiceUtils';
import { BountyCreateNew } from '../../types/bounty/BountyCreateNew';
import ListBounty from '../../service/bounty/ListBounty';
import CreateNewBounty from '../../service/bounty/create/CreateNewBounty';
import PublishBounty from '../../service/bounty/create/PublishBounty';
import ClaimBounty from '../../service/bounty/ClaimBounty';
import SubmitBounty from '../../service/bounty/SubmitBounty';
import CompleteBounty from '../../service/bounty/CompleteBounty';
import discordServerIds from '../../service/constants/discordServerIds';
import Log, { LogUtils } from '../../utils/Log';

export default class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, claimBounty, delete, and mark bounties complete',
			guildIDs: [discordServerIds.banklessDAO, discordServerIds.discordBotGarage],
			options: [
				{
					name: 'claim',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Claim a bounty to work on',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
				{
					name: 'complete',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Mark bounty as complete and reward the claimer',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
				{
					name: 'create',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Create a new draft of a bounty and finalize on the website',
					options: [
						{
							name: 'title',
							type: CommandOptionType.STRING,
							description: 'What should the bounty be called?',
							required: true,
						},
						{
							name: 'reward',
							type: CommandOptionType.STRING,
							description: 'What is the reward? (i.e 100 BANK)',
							required: true,
						},
						{
							name: 'copies',
							type: CommandOptionType.INTEGER,
							description: 'How many bounties should be published? (level 3+, max 100)',
							required: false,
						},
					],
				},
				{
					name: 'publish',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Validate discord handle drafted bounty from the website',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Bounty hash ID',
							required: true,
						},
					],
				},
				{
					name: 'list',
					type: CommandOptionType.SUB_COMMAND,
					description: 'View list of bounties you created or are claimed',
					options: [
						{
							name: 'list-type',
							type: CommandOptionType.STRING,
							description: 'Which bounties should be displayed?',
							choices: [
								{
									name: 'created by me',
									value: 'CREATED_BY_ME',
								},
								{
									name: 'claimed by me',
									value: 'CLAIMED_BY_ME',
								},
								{
									name: 'drafted by me',
									value: 'DRAFT_BY_ME',
								},
								{
									name: 'open',
									value: 'OPEN',
								},
								{
									name: 'in progress',
									value: 'IN_PROGRESS',
								},
							],
							required: true,
						},
					],
				},
				{
					name: 'delete',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Delete an open or in draft bounty',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
				{
					name: 'submit',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Submit the bounty that you are working on. Bounty will be reviewed',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
						{
							name: 'url',
							type: CommandOptionType.STRING,
							description: 'Url of work',
							required: false,
						},
						{
							name: 'notes',
							type: CommandOptionType.STRING,
							description: 'any additional notes for bounty completion',
							required: false,
						},
					],
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(ctx: CommandContext): Promise<any> {
		LogUtils.logCommandStart(ctx);
		if (ctx.user.bot) return;

		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		let command: Promise<any>;
		let params;
		
		try {
			switch (ctx.subcommands[0]) {
			case 'claim':
				command = ClaimBounty(guildMember, ctx.options.claim['bounty-id']);
				break;
			case 'create':
				params = this.buildBountyCreateNewParams(ctx.guildID, ctx.options.create);
				command = CreateNewBounty(guildMember, params);
				break;
			case 'publish':
				command = PublishBounty(guildMember, ctx.options.publish['bounty-id']);
				break;
			case 'complete':
				command = CompleteBounty(guildMember, ctx.options.complete['bounty-id']);
				break;
			case 'delete':
				command = DeleteBounty(guildMember, ctx.options.delete['bounty-id']);
				break;
			case 'list':
				command = ListBounty(guildMember, ctx.options.list['list-type']);
				break;
			case 'submit':
				command = SubmitBounty(guildMember, ctx.options.submit['bounty-id'], ctx.options.submit['url'], ctx.options.submit['notes']);
				break;
			default:
				return ctx.send(`${ctx.user.mention} Please try again.`);
			}
			this.handleCommandError(ctx, command);
		} catch (e) {
			Log.error(e);
		}
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>): void {
		command.then(() => {
			return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else {
				LogUtils.logError('error', e);
				return ctx.send('Sorry something is not working and our devs are looking into it.');
			}
		});
	}
	
	buildBountyCreateNewParams(guild: string, ctxOptions: { [key: string]: any }): BountyCreateNew {
		const [reward, symbol] = (ctxOptions.reward != null) ? ctxOptions.reward.split(' ') : [null, null];
		const copies = (ctxOptions.copies == null || ctxOptions.copies <= 0) ? 1 : ctxOptions.copies;
		let scale = reward.split('.')[1]?.length;
		scale = (scale != null) ? scale : 0;
		return {
			customer_id: guild,
			title: ctxOptions.title,
			reward: {
				amount: reward,
				currencySymbol: symbol,
				scale: scale,
				amountWithoutScale: reward.replace('.', ''),
			},
			copies: copies,
		};
	}
}