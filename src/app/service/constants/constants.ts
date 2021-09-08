export default Object.freeze({
	DISCORD_ROLE_GUEST_PASS: 'Guest Pass',

	DB_NAME_DEGEN: 'degen',
	DB_NAME_BOUNTY_BOARD: 'bountyboard',
	DB_COLLECTION_GUEST_USERS: 'guestUsers',
	DB_COLLECTION_BOUNTIES: 'bounties',
	DB_COLLECTION_POAP_SETTINGS: 'poapSettings',
	DB_COLLECTION_POAP_PARTICIPANTS: 'poapParticipants',

	MONGODB_URI_PARTIAL: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/`,
	MONGODB_OPTIONS: '?retryWrites=true&w=majority',
	BOUNTY_BOARD_URL: 'https://bankless.community/',

	BOUNTY_BOARD_WEBSITE_WEBHOOK_NAME: 'bounty-board-website',
	BOUNTY_BOARD_END_OF_SEASON_DATE: process.env.DAO_CURRENT_SEASON_END_DATE,

	SCOAP_HTTP_SERVER_CORS_WHITELIST: ['http://localhost:3000'],
	SCOAP_HTTP_SERVER_PORT: 5000,
	SCOAP_SQUAD_EMBED_SPACER: '\u2800'.repeat(60),

	SCOAP_SQUAD_NOTION_FIELDS: {
		project: {
			type: 'title',
			field_name: 'Project',
		},
		author_discord_handle: {
			type: 'rich_text',
			field_name: 'Author Discord Handle',
		},
		scoap_squad_discord_handles: {
			type: 'multi_select',
			field_name: 'Scoap Squad Discord Handles',
		},
		status: {
			type: 'select',
			field_name: 'Status',
			categories: {
				open: 'Open',
				filled: 'Filled (Ongoing)',
				closed: 'Project Completed',
				cancelled: 'Cancelled',
			},
		},
		date_created: {
			type: 'date',
			field_name: 'Date Created',
		},
	},

	NOTION_COLORS: ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'],

	BOTPLAYS_BOT_USER_ID: '867605079811817483',

	BOT_CONVERSATION_TIMEOUT_MS: 1000 * 60 * 60 * 24, // active for 24 h

	SCOAP_POLL_TIMEOUT_MS: 1000 * 60 * 60 * 168, // one week

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
});