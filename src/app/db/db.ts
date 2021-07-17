import { Db, MongoClient, MongoError } from 'mongodb';

const state: {db: Db, mode} = {
	db: null,
	mode: null,
};

const db = {
	connect(url: string, database: string, done: (error?: MongoError) => void): void {
		if (state.db) {
			return done();
		} else {
			MongoClient.connect(
				url,
				{ useUnifiedTopology: true },
				(err: MongoError, client: MongoClient) => {
					if (err) {
						return console.error(err);
					} else {
						state.db = client.db(database);
						done();
					}
				},
			);
		}
	},

	get(): Db {
		return state.db;
	},
};

export default db;
