export default Object.freeze({
	INVITE_BOT_POAP_LINK: 'https://discord.com/api/oauth2/authorize?client_id=927569512612659230&permissions=2147576832&scope=bot%20applications.commands',
	DB_NAME_DEGEN: 'degen',
	DB_NAME_NEXTAUTH: 'nextauth',
	
	DB_COLLECTION_POAP_SETTINGS: 'poapSettings',
	DB_COLLECTION_POAP_PARTICIPANTS: 'poapParticipants',
	DB_COLLECTION_POAP_UNCLAIMED_PARTICIPANTS: 'poapUnclaimedParticipants',
	DB_COLLECTION_POAP_TWITTER_UNCLAIMED_PARTICIPANTS: 'poapTwitterUnclaimedParticipants',
	DB_COLLECTION_POAP_TWITTER_SETTINGS: 'poapTwitterSettings',
	DB_COLLECTION_POAP_TWITTER_PARTICIPANTS: 'poapTwitterParticipants',
	
	DB_COLLECTION_NEXT_AUTH_SESSIONS: 'sessions',
	DB_COLLECTION_NEXT_AUTH_ACCOUNTS: 'accounts',
	
	DB_COLLECTION_POAP_ADMINS: 'poapAdmins',
	
	MONGODB_URI_PARTIAL: `${process.env.MONGODB_PREFIX}://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/`,
	MONGODB_OPTIONS: '?retryWrites=true&w=majority',
	
	PLATFORM_TYPE_DISCORD: 'DISCORD',
	PLATFORM_TYPE_TWITTER: 'TWITTER',
});