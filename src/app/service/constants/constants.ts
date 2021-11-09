export default Object.freeze({
	DB_NAME_DEGEN: 'degen',
	DB_NAME_BOUNTY_BOARD: 'bountyboard',
	
	DB_COLLECTION_GUEST_USERS: 'guestUsers',
	DB_COLLECTION_BOUNTIES: 'bounties',
	DB_COLLECTION_POAP_SETTINGS: 'poapSettings',
	DB_COLLECTION_POAP_PARTICIPANTS: 'poapParticipants',
	DB_COLLECTION_POAP_ADMINS: 'poapAdmins',
	DB_COLLECTION_ALLOWLIST: 'allowList',

	MONGODB_URI_PARTIAL: `${process.env.MONGODB_PREFIX}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/`,
	MONGODB_OPTIONS: '?retryWrites=true&w=majority',
	
	BOUNTY_BOARD_WEBSITE_WEBHOOK_NAME: 'bounty-board-website',
	BOUNTY_BOARD_END_OF_SEASON_DATE: process.env.DAO_CURRENT_SEASON_END_DATE,
});