import { Db, MongoClient, MongoError } from 'mongodb';
import constants from '../constants';

const state: {db: Db, client: MongoClient, mode} = {
	db: null,
	client: null,
	mode: null,
};

const db = {
	connect(database: string, done: (error?: MongoError) => void): Promise<any> {
		try {
			console.log('hello?');
			MongoClient.connect(
				constants.MONGODB_URI_PARTIAL + database + constants.MONGODB_OPTIONS,
				{ useUnifiedTopology: true },
				async (err: MongoError, client: MongoClient) => {
					if (err) {
						console.log('something broke');
						return done(err);
					} else {
						state.db = client.db(database);
						state.client = client;
						return done();
					}
				},
			);
		} catch (e) {
			console.log('inside done');
			return done(e);
		}
	},

	get(): Db {
		return state.db;
	},

	close(): Promise<void> {
		return state.client.close();
	},
};

export default db;
