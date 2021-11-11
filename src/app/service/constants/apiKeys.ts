const apiKeys = Object.freeze({
	twitterAppToken: process.env.TWITTER_API_TOKEN,
	twitterAppSecret: process.env.TWITTER_API_SECRET,
	twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
	twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN,
	twitterSecretToken: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	twitterVerificationUrl: process.env.TWITTER_VERIFICATION_URL,
});

export default apiKeys;