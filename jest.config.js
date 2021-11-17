/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
	preset: '@shelf/jest-mongodb',
	clearMocks: true,
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageProvider: 'v8',
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	roots: ['<rootDir>/src'],
	testMatch: [
		'**/__tests__/**/*.+(ts|tsx|js)',
		'**/?(*.)+(spec|test).+(ts|tsx|js)',
	],
	watchPathIgnorePatterns: ['globalConfig'],
};

/*
 * Environmental variables prep
 */
process.env.DISCORD_BOT_APPLICATION_ID = '234324234234';
process.env.DISCORD_BOT_PUBLIC_KEY = 'sdafsdafasdfsdaf';
process.env.DISCORD_BOT_TOKEN =
    'asfsadf.YLsadfvgyg.106GODufx1masdfsdaf8JwsPdru0KWuG8BY';
process.env.DISCORD_OWNER_ID = '23432434';
process.env.MONGODB_USERNAME = 'user';
process.env.MONGODB_PASS = 'asfsdfasf';
process.env.MONGODB_CLUSTER = 'clusasfdasdf.asdfsd';
process.env.NOTION_TOKEN = 'secret+asfsdfsdfasdfsadf';
process.env.FAQS_PAGE_ID = '6a2ba0a4-fd1e-4381-b365-6ad5afd418fa';
process.env.DISCORD_SERVER_ID = '24332423423';
process.env.DISCORD_ROLE_GUEST_PASS = '857683488131907624';
process.env.NOTION_GUEST_PASS_DATABASE_ID = '3453453245345';
process.env.DAO_CURRENT_SEASON = '1';
process.env.DISCORD_ROLE_LEVEL_2 = '34523454352';
process.env.DISCORD_ROLE_ADMIN_ROLE_ID = '80000';
process.env.DISCORD_ROLE_GRANTS_COMITTEE = '80001';
process.env.DISCORD_ROLE_GENESIS_SQUAD = '80002';
process.env.DISCORD_ROLE_LVL_4 = '80003';
process.env.DISCORD_ROLE_LEVEL_3 = '80004';
process.env.DISCORD_ROLE_CONTRIBUTORS_LVL_2 = '80005';
process.env.DISCORD_ROLE_DEVELOPERS_GUILD = '80006';
process.env.LOGDNA_TOKEN = '1234567';
process.env.DISCORD_ROLE_AFK = '905451590121586719';