import { Db, ObjectID } from 'mongodb';
import fqConstants from '../service/constants/firstQuest';
import constants from '../service/constants/constants';
import dbInstance from './MongoDbUtils';
import Log from './Log';

export const fqInit = async (): Promise<void> => {
	const db: Db = await dbInstance.connect(constants.DB_NAME_DEGEN);

	const doc = {
		_id: ObjectID(fqConstants.FIRST_QUEST_DB_DOCUMENT_ID),
		messages: fqConstants.FIRST_QUEST_INIT,
		last_updated: 0,
	};

	const firstQuestContent = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT).find({});

	const data = await firstQuestContent.toArray();

	if (data.length === 0) {
		const insert = await db.collection(constants.DB_COLLECTION_FIRST_QUEST_CONTENT).insertOne(doc);

		Log.info(`First Quest initiation: Message content updated, insert result, ${insert.result}`);

	} else {
		Log.info('First Quest initiation: nothing to do.');
	}
};