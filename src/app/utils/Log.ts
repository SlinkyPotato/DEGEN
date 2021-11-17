import logdna, { Logger, LogOptions } from '@logdna/logger';
import { CommandContext } from 'slash-create';

class Log {
	static logger: Logger;
	
	constructor() {
		try {
			Log.logger = logdna.createLogger(process.env.LOGDNA_TOKEN, {
				app: process.env.LOGDNA_APP_NAME,
				level: process.env.LOGDNA_DEFAULT_LEVEL,
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.log('Please setup LogDNA token.');
			// eslint-disable-next-line no-console
			console.log(e);
		}
	}
	
	static info(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(statement);
		}
		this.logger.info(statement, options);
	}

	static warn(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(statement);
		}
		this.logger.warn(statement, options);
	}

	static debug(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development' && process.env.LOGDNA_DEFAULT_LEVEL == 'debug') {
			// eslint-disable-next-line no-console
			console.debug(statement);
		}
		this.logger.debug(statement, options);
	}

	static error(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.error(statement);
		}
		this.logger.error(statement, options);
	}

	static fatal(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.error(statement);
		}
		this.logger.fatal(statement, options);
	}

	static trace(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(statement);
		}
		this.logger.trace(statement, options);
	}

	static log(statement: string | any, options?: Omit<LogOptions, 'level'>): void {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.log(statement);
		}
		this.logger.log(statement, options);
	}
	
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static addMetaProperty(key: string, value: any): void {
		this.logger.addMetaProperty(key, value);
	}
	
	static removeMetaProperty(key: string): void {
		this.logger.removeMetaProperty(key);
	}
	
	static flush(): void {
		this.logger.flush();
	}
}

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
	
	logError(message: string, error: Error, guildId?: string): void {
		Log.error(message, {
			indexMeta: true,
			meta: {
				name: error.name,
				message: error.message,
				stack: error.stack,
				guildId: guildId,
			},
		});
	},
};

export default Log;