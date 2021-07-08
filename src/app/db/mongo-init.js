// Local database user
db.createUser(
    {
        user: 'dev',
        pwd: 'pass',
        roles: [{ role: 'readWrite', db: 'bankless' }],
    },
);