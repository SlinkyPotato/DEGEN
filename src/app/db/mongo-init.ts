// Local database user
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
db.createUser(
	{
		user: 'dev',
		pwd: 'pass',
		roles: [{ role: 'readWrite', db: 'bankless' }],
	},
);