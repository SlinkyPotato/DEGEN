import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import constants from '../service/constants/constants';
import Log, { LogUtils } from './Log';

const MongoDbUtils = {
	state: {
		dbMap: new Map<string, Db>(),
		clientMap: new Map<string, MongoClient>(),
	},

	connect: async (database: string): Promise<Db> => {
		try {
			let db: Db | undefined = MongoDbUtils.state.dbMap.get(database);
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
				db = mongoClient.db();
				Log.debug('Connected to MongoDB');
			}
			return db;
		} catch (e) {
			LogUtils.logError(`Error connecting to db: ${e}`, e);
			throw e;
			
		}
	},

};

export default MongoDbUtils;