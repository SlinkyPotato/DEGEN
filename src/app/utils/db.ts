import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import constants from '../service/constants/constants';

const state: { dbMap: Map<string, Db>, clientMap: Map<string, MongoClient> } = {
	dbMap: new Map(),
	clientMap: new Map(),
};

export default {
	async dbConnect(database: string): Promise<Db> {
		const db = state.dbMap.get(database);
		if (db == null) {
			await connect(database);
		}
		return db;
	},
};

export const connect = async (database: string): Promise<void> => {
	console.log(`connecting to ${database} for first time`);
	const options: MongoClientOptions = {
		writeConcern: {
			w: 'majority',
		},
		useUnifiedTopology: true,
	};
	const mongoClient = await MongoClient.connect(constants.MONGODB_URI_PARTIAL + database, options);
	state.clientMap.set(database, mongoClient);
	state.dbMap.set(database, mongoClient.db(database));
};
