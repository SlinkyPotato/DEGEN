export default Object.freeze({
	DB_NAME_DEGEN: 'degen',
	DB_NAME_BOUNTY_BOARD: 'bountyboard',
	DB_NAME_NEXTAUTH: 'nextauth',

	DB_COLLECTION_TIMECARDS: 'timecards',
	DB_COLLECTION_GUEST_USERS: 'guestUsers',
	DB_COLLECTION_BOUNTIES: 'bounties',

	DB_COLLECTION_POAP_SETTINGS: 'poapSettings',
	DB_COLLECTION_POAP_PARTICIPANTS: 'poapParticipants',
	DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS: 'poapUnclaimedParticipants',
	DB_COLLECTION_POAP_TWITTER_SETTINGS: 'poapTwitterSettings',
	DB_COLLECTION_POAP_TWITTER_PARTICIPANTS: 'poapTwitterParticipants',

	DB_COLLECTION_NEXT_AUTH_SESSIONS: 'sessions',
	DB_COLLECTION_NEXT_AUTH_ACCOUNTS: 'accounts',

	DB_COLLECTION_SCOAP_SQUAD: 'scoapSquad',
	DB_COLLECTION_POAP_ADMINS: 'poapAdmins',
	DB_COLLECTION_ALLOWLIST: 'allowList',

	DB_COLLECTION_FIRST_QUEST_CONTENT: 'firstQuestContent',
	DB_COLLECTION_FIRST_QUEST_TRACKER: 'firstQuestTracker',
	DB_COLLECTION_FIRST_QUEST_POAPS: 'firstQuestPOAPs',
	MONGODB_URI_PARTIAL: `${process.env.MONGODB_PREFIX}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/`,
	MONGODB_OPTIONS: '?retryWrites=true&w=majority',

	BOUNTY_BOARD_WEBSITE_WEBHOOK_NAME: 'bounty-board-website',
	BOUNTY_BOARD_END_OF_SEASON_DATE: process.env.DAO_CURRENT_SEASON_END_DATE,

	SCOAP_SQUAD_EMBED_SPACER: '\u2800'.repeat(60),
	// active for 24 h
	BOT_CONVERSATION_TIMEOUT_MS: 1000 * 60 * 60 * 24,
	// one week
	SCOAP_POLL_TIMEOUT_MS: 1000 * 60 * 60 * 168,

	EMOJIS: {
		'1': '\u0031\uFE0F\u20E3',
		'2': '\u0032\uFE0F\u20E3',
		'3': '\u0033\uFE0F\u20E3',
		'4': '\u0034\ufe0f\u20e3',
		'5': '\u0035\ufe0f\u20e3',
		'6': '\u0036\ufe0f\u20e3',
		'7': '\u0037\ufe0f\u20e3',
		'8': '\u0038\ufe0f\u20e3',
		'9': '\u0039\ufe0f\u20e3',
		plus: '\u2795\u2B1C',
		memo: String.fromCodePoint(0x1F4DD),
		cross_mark: '\u274C',
	},

	POAP_REQUIRED_PARTICIPATION_DURATION: Number(process.env.POAP_REQUIRED_PARTICIPATION_DURATION),
	POAP_MAX_DURATION_MINUTES: Number(process.env.POAP_MAX_EVENT_DURATION_MINUTES),

	PLATFORM_TYPE_DISCORD: 'DISCORD',
	PLATFORM_TYPE_TWITTER: 'TWITTER',

	BANNED_NAMES: [
		'admin',
		'support',
		'bankless',
		'banklessdao',
		'banklessadmin',
		'banklesssupport',
		'metamask',
		'metamasksupport',
		'uniswap',
		'uniswapsupport',
		'daopunkssupport',
	],
});
