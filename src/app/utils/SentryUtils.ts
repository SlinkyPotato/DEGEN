import {
	CommandContext,
	SlashCommand,
} from 'slash-create';
import Log from './Log';
import * as Sentry from '@sentry/node';

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
			
			scope.setUser({
				id: ctx.member?.id,
				username: ctx.member?.user.username,
				discriminator: ctx.member?.user.discriminator,
				nickname: ctx.member?.nick,
			});
			
			scope.setTags({
				guild: ctx.guildID,
				channelId: ctx.channelID,
				commandName: ctx.commandName,
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
