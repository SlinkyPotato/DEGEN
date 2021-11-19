/**
 * Script to create local databases
 */

db = db.getSiblingDB('bountyboard');
db.createUser(
	{
		user: 'dev',
		pwd: 'pass',
		roles: [{ role: 'readWrite', db: 'bountyboard' }],
	},
);