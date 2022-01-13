import logdna, { Logger, LogOptions } from '@logdna/logger';
import apiKeys from '../service/constants/apiKeys';
import { CommandContext } from 'slash-create';
import * as Sentry from '@sentry/node';

let logger: Logger;

try {
	logger = logdna.createLogger(apiKeys.logDNAToken, {
		app: apiKeys.logDNAAppName,
		level: apiKeys.logDNADefault,
	});
	if (process.env.NODE_ENV != 'production' || !logger.info) {
		// eslint-disable-next-line no-console
		console.log('Logger initialized!');
	} else {
		logger.log('Logger initialized!');
	}
} catch (e) {
	// eslint-disable-next-line no-console
	console.log('Please setup LogDNA token.');
	// eslint-disable-next-line no-console
	console.log(e);
	throw new Error();
}

const Log = {
	
	info(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.info) {
			// eslint-disable-next-line no-console
			console.log(statement);
		} else {
			logger.info(statement, options);
		}
	},
	
	warn(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.warn) {
			// eslint-disable-next-line no-console
			console.log(statement);
		} else {
			logger.warn(statement, options);
		}
	},
	
	debug(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.debug) {
			// eslint-disable-next-line no-console
			console.debug(statement);
		} else {
			logger.debug(statement, options);
		}
	},
	
	error(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.error) {
			// eslint-disable-next-line no-console
			console.error(statement);
		} else {
			logger.error(statement, options);
		}
	},
	
	fatal(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.fatal) {
			// eslint-disable-next-line no-console
			console.error(statement);
		} else {
			logger.fatal(statement, options);
		}
	},
	
	trace(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production' || !logger.trace) {
			// eslint-disable-next-line no-console
			console.log(statement);
		} else {
			logger.trace(statement, options);
		}
	},
	
	log(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV != 'production') {
			// eslint-disable-next-line no-console
			console.log(statement);
		}
		logger.log(statement, options);
	},
	
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	addMetaProperty(key: string, value: any): void {
		logger.addMetaProperty(key, value);
	},
	
	removeMetaProperty(key: string): void {
		logger.removeMetaProperty(key);
	},
	
	flush(): void {
		logger.flush();
	},
};

export const LogUtils = {
	logCommandStart(ctx: CommandContext): void {
		Log.info(`/${ctx.commandName} ran ${ctx.user.username}#${ctx.user.discriminator}`, {
			indexMeta: true,
			meta: {
				guildId: ctx.guildID,
				userTag: `${ctx.user.username}#${ctx.user.discriminator}`,
				userId: ctx.user.id,
				params: ctx.options,
			},
		});
	},
	
	logCommandEnd(ctx: CommandContext): void {
		Log.info(`/${ctx.commandName} ended ${ctx.user.username}#${ctx.user.discriminator}`, {
			indexMeta: true,
			meta: {
				guildId: ctx.guildID,
				userTag: `${ctx.user.username}#${ctx.user.discriminator}`,
				userId: ctx.user.id,
				params: ctx.options,
			},
		});
	},
	
	logError(message: string, error: Error | any, guildId?: string): void {
		try {
			if (error != null && error instanceof Error) {
				Sentry.captureException(error, {
					tags: {
						guildId: guildId,
					},
				});
				Log.error(message, {
					indexMeta: true,
					meta: {
						name: error?.name,
						message: error?.message,
						stack: error?.stack,
						guildId: guildId,
					},
				});
			} else {
				Log.error(message);
			}
		} catch (e) {
			Log.warn(message);
		}
	},
};

export default Log;