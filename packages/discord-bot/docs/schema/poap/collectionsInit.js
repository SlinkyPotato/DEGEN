// Mongosh operations to be done on database collections
db.poapSettings.createIndex({ event: 1 }, { unique: true });
db.poapParticipants.createIndex({ event: 1, discordId: 1 }, { unique: true });