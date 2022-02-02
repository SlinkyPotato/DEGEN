const apiKeys = Object.freeze({
	DISCORD_BOT_ID: process.env.DISCORD_BOT_APPLICATION_ID as string,
	
	twitterAppToken: process.env.TWITTER_API_TOKEN,
	twitterAppSecret: process.env.TWITTER_API_SECRET,
	twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
	twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN,
	twitterSecretToken: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	twitterVerificationUrl: process.env.TWITTER_VERIFICATION_URL,
	twitterClaimPage: process.env.TWITTER_CLAIM_PAGE,
	
	logDNAToken: process.env.LOGDNA_TOKEN as string,
	logDNAAppName: process.env.LOGDNA_APP_NAME,
	logDNADefault: process.env.LOGDNA_DEFAULT_LEVEL,
	
	sentryDSN: process.env.SENTRY_IO_DSN,
});

export default apiKeys;
