import {
	ApplicationCommandPermissionType,
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import ValidationError from '../../errors/ValidationError';
import DeleteBounty from '../../service/bounty/DeleteBounty';
import ServiceUtils from '../../utils/ServiceUtils';
import roleIDs from '../../service/constants/roleIDs';
import { BountyCreateNew } from '../../types/bounty/BountyCreateNew';
import ListBounty from '../../service/bounty/ListBounty';
import CreateNewBounty from '../../service/bounty/create/CreateNewBounty';
import PublishBounty from '../../service/bounty/create/PublishBounty';
import ClaimBounty from '../../service/bounty/ClaimBounty';
import SubmitBounty from '../../service/bounty/SubmitBounty';
import CompleteBounty from '../../service/bounty/CompleteBounty';

module.exports = class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, claimBounty, delete, and mark bounties complete',
			guildIDs: process.env.DISCORD_SERVER_ID,
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
						{
							name: 'is-complete',
							type: CommandOptionType.BOOLEAN,
							description: 'Is the bounty complete as per criteria?',
							required: true,
						},
					],
				},
				{
					name: 'create',
					type: CommandOptionType.SUB_COMMAND_GROUP,
					description: 'Create a bounty for the bounty board',
					options: [
						{
							name: 'new',
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
									name: 'summary',
									type: CommandOptionType.STRING,
									description: 'What would you like to be worked on?',
									required: true,
								},
								{
									name: 'criteria',
									type: CommandOptionType.STRING,
									description: 'What is absolutely required for this bounty?',
									required: true,
								},
								{
									name: 'reward',
									type: CommandOptionType.STRING,
									description: 'What is the reward? (i.e 100 BANK)',
									required: true,
								},
							],
						},
						{
							name: 'open',
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
									name: 'open',
									value: 'OPEN',
								},
								{
									name: 'in-progress',
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
			defaultPermission: false,
			permissions: {
				[process.env.DISCORD_SERVER_ID]: [
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.level1,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.level2,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.level3,
						permission: true,
					},
					{
						type: ApplicationCommandPermissionType.ROLE,
						id: roleIDs.level4,
						permission: true,
					},
				],
			},
		});
	}

	async run(ctx: CommandContext) {
		if (ctx.user.bot) return;
		console.log(`/bounty start ${ctx.user.username}#${ctx.user.discriminator}`);

		const { guildMember } = await ServiceUtils.getGuildAndMember(ctx);
		let command: Promise<any>;
		switch (ctx.subcommands[0]) {
		case 'claim':
			console.log('/bounty claim');
			command = ClaimBounty(guildMember, ctx.options.claim['bounty-id']);
			break;
		case 'create':
			if (ctx.subcommands[1] === 'new') {
				const params = this.buildBountyCreateNewParams(ctx.options.create.new);
				console.log('/bounty create new ' + params);
				command = CreateNewBounty(guildMember, params, ctx);
			} else if (ctx.subcommands[1] === 'open') {
				console.log('/bounty create open ');
				command = PublishBounty(guildMember, ctx.options.create.open['bounty-id']);
			} else {
				return ctx.send(`<@${ctx.user.id}> Sorry command not found, please try again`);
			}
			break;
		case 'complete':
			console.log('/bounty complete');
			command = CompleteBounty(guildMember, ctx.options.complete['bounty-id'], ctx.options.complete['is-complete']);
			break;
		case 'delete':
			console.log('/bounty delete');
			command = DeleteBounty(guildMember, ctx.options.delete['bounty-id']);
			break;
		case 'list':
			console.log('/bounty list');
			command = ListBounty(guildMember, ctx.options.list['list-type']);
			break;
		case 'submit':
			console.log('/bounty submit');
			command = SubmitBounty(guildMember, ctx.options.submit['bounty-id'], ctx.options.submit['url'], ctx.options.submit['notes']);
			break;
		default:
			return ctx.send(`${ctx.user.mention} Please try again.`);
		}
		this.handleCommandError(ctx, command);
	}

	handleCommandError(ctx: CommandContext, command: Promise<any>) {
		command.then(() => {
			console.log(`/bounty end ${ctx.user.username}#${ctx.user.discriminator}`);
			return ctx.send(`${ctx.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			console.error('ERROR', e);
			if (e instanceof ValidationError) {
				return ctx.send(e.message);
			} else {
				return ctx.send('Sorry something is not working and our devs are looking into it');
			}
		});
	}
	
	buildBountyCreateNewParams(ctxOptions): BountyCreateNew {
		const [reward, symbol] = (ctxOptions.reward != null) ? ctxOptions.reward.split(' ') : [null, null];
		let scale = reward.split('.')[1]?.length;
		scale = (scale != null) ? scale : 0;
		return {
			title: ctxOptions.title,
			summary: ctxOptions.summary,
			criteria: ctxOptions.criteria,
			reward: {
				amount: reward.replace('.', ''),
				currencySymbol: symbol,
				scale: scale,
			},
		};
	}
};