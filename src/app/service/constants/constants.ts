export default Object.freeze({
	DISCORD_ROLE_GUEST_PASS: 'Guest Pass',

	DB_NAME_DEGEN: 'degen',
	DB_NAME_BOUNTY_BOARD: 'bountyboard',
	DB_COLLECTION_GUEST_USERS: 'guestUsers',
	DB_COLLECTION_BOUNTIES: 'bounties',

	MONGODB_URI_PARTIAL: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/`,
	MONGODB_OPTIONS: '?retryWrites=true&w=majority',
	BOUNTY_BOARD_URL: 'https://bankless.community/',
});