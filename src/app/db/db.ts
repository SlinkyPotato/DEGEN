import { Db, MongoClient, MongoError } from 'mongodb';
import constants from '../constants';

const state: {db: Db, client: MongoClient, mode} = {
	db: null,
	client: null,
	mode: null,
};

const db = {
	connect(database: string, done: (error?: MongoError) => void): void {
		MongoClient.connect(
			constants.MONGODB_URI_PARTIAL + database + constants.MONGODB_OPTIONS,
			{ useUnifiedTopology: true },
			async (err: MongoError, client: MongoClient) => {
				if (err) {
					return console.error(err);
				} else {
					state.db = client.db(database);
					state.client = client;
					done();
				}
			},
		);
	},

	get(): Db {
		return state.db;
	},

	close(): Promise<void> {
		return state.client.close();
	},
};

export default db;
