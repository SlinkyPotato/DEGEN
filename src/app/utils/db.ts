import { Db, MongoClient } from 'mongodb';
import constants from '../constants';

const state: {db: Db, client: MongoClient, mode} = {
	db: null,
	client: null,
	mode: null,
};

const dbInstance = {
	connect: (database: string): Promise<any> => {
		return MongoClient.connect(
			constants.MONGODB_URI_PARTIAL + database + constants.MONGODB_OPTIONS,
			{ useUnifiedTopology: true }).then((client: MongoClient) => {
			state.db = client.db(database);
			state.client = client;
			return client;
		}).catch(e => {
			console.log('ERROR', e);
			return e;
		});
	},

	db(): Db {
		return state.db;
	},
	
	async dbConnect(database: string): Promise<Db> {
		await this.connect(database);
		return this.db();
	},

	close(): Promise<void> {
		const closePromise = state.client.close();
		state.db = null;
		state.client = null;
		return closePromise;
	},
};

export default dbInstance;
