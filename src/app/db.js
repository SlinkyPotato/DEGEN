const MongoClient = require('mongodb').MongoClient;

const state = {
	db: null,
};

const db = {
	connect(url, done) {
		if (state.db) {
			return done();
		}
		else {
			MongoClient.connect(
				url,
				{ useUnifiedTopology: true },
				(err, client) => {
					if (err) {
						return console.error(err);
					}
					else {
						// console.log(client);
						state.db = client.db('bankless');
						done();
					}
				},
			);
		}
	},

	get() {
		return state.db;
	},

	close(done) {
		if (state.db) {
			state.db.close((err, result) => {
				state.db = null;
				state.mode = null;
				done(err);
			});
		}
	},
};

module.exports = db;
