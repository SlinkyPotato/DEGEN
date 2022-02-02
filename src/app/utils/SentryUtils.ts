import {
	CommandContext,
	SlashCommand,
} from 'slash-create';
import Log from './Log';
import * as Sentry from '@sentry/node';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import { Message } from 'discord.js';

export function command(target: SlashCommand, propertyKey: string, descriptor: PropertyDescriptor): void {
	if (propertyKey != 'run') {
		Log.warn('incorrect decorator usage');
		return;
	}
	
	const originalMethod = descriptor.value;
	
	descriptor.value = async function(ctx: CommandContext) {
		const transaction = Sentry.startTransaction({
			op: 'command',
			name: ctx.commandName,
		});
		
		Sentry.configureScope(async scope => {
			scope.setTransactionName(`/${ctx.commandName} ${ctx.subcommands[0]}`);
			
			scope.setSpan(transaction);
			
			const userId = (ctx.member?.id) ? ctx.member?.id : '';
			const userName = (ctx.member?.user?.username) ? ctx.member?.user?.username : '';
			const discriminator = (ctx.member?.user?.discriminator) ? ctx.member?.user?.discriminator : '';
			const nickName = (ctx.member?.nick) ? ctx.member?.nick : '';
			
			scope.setUser({
				id: userId,
				username: userName,
				discriminator: discriminator,
				nickname: nickName,
			});
			
			const guildId = (ctx.guildID) ? ctx.guildID : '';
			const channelId = (ctx.channelID) ? ctx.channelID : '';
			const commandName = (ctx.commandName) ? ctx.commandName : '';
			
			scope.setTags({
				guild: guildId,
				channelId: channelId,
				commandName: commandName,
			});
			
			try {
				await originalMethod.apply(this, [ctx]);
			} catch (e) {
				Sentry.captureException(e);
			} finally {
				transaction.finish();
			}
		});
	};
}

export function message_event(target: DiscordEvent, propertyKey: string, descriptor: PropertyDescriptor): void {
	if (propertyKey != 'execute') {
		Log.warn('incorrect decorator usage');
		return;
	}
	const originalMethod = descriptor.value;
	
	descriptor.value = async function(message: Message) {
		const transaction = Sentry.startTransaction({
			op: 'message',
			name: 'message_event',
		});
		
		Sentry.configureScope(async scope => {
			scope.setTransactionName('messageCreate');
			
			scope.setSpan(transaction);
			
			const authorId = (message.author?.id?.toString()) ? message.author?.id?.toString() : '';
			const authorUserName = (message.author?.username) ? message.author?.username : '';
			const discriminator = (message.author?.discriminator) ? message.author?.discriminator : '';
			
			scope.setUser({
				id: authorId,
				username: authorUserName,
				discriminator: discriminator,
			});
			
			const guildId = (message.guild?.id?.toString()) ? message.guild?.id?.toString() : '';
			const channelId = message.channel?.id?.toString() ? message.channel?.id?.toString() : '';
			
			scope.setTags({
				guild: guildId,
				channelId: channelId,
				event: 'messageCreate',
			});
			
			try {
				await originalMethod.apply(this, [message]);
			} catch (e) {
				Sentry.captureException(e);
			} finally {
				transaction.finish();
			}
		});
	};
}
