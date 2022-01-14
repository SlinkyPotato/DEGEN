const apiKeys = Object.freeze({
	logDNAToken: process.env.LOGDNA_TOKEN as string,
	logDNAAppName: process.env.LOGDNA_APP_NAME,
	logDNADefault: process.env.LOGDNA_DEFAULT_LEVEL,
});

export default apiKeys;