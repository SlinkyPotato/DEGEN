import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import constants from '../service/constants/constants';
import Log from './Log';

const MongoDbUtils = {
	state: {
		dbMap: new Map<string, Db>(),
		clientMap: new Map<string, MongoClient>(),
	},

	connect: async (database: string): Promise<Db> => {
		const db: Db | undefined = MongoDbUtils.state.dbMap.get(database);
		if (db == null) {
			Log.debug(`Connecting to ${database} for first time!`);
			const options: MongoClientOptions = {
				writeConcern: {
					w: 'majority',
				},
				useUnifiedTopology: true,
			};
			const mongoClient = await MongoClient.connect(constants.MONGODB_URI_PARTIAL + database, options);
			MongoDbUtils.state.clientMap.set(database, mongoClient);
			MongoDbUtils.state.dbMap.set(database, mongoClient.db(database));
		}
		return db;
	},

};

export default MongoDbUtils;