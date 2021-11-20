/**
 * Script to create local databases
 */

db = db.getSiblingDB('degen');
db.createUser(
	{
		user: 'dev',
		pwd: 'pass',
		roles: [{ role: 'readWrite', db: 'degen' }],
	},
);
