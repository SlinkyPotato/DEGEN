// Mongosh operations to be done on database collections
db.timecard.createIndex({ discordUserId: 1, isActive: 1, startTime: 1 }, { unique: true });
db.timecard.createIndex({ discordUserId: 1, duration: 1, discordServerId: 1 }, { unique: true });