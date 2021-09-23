module.exports = {
	apps : [{
		name   : 'DEGEN',
		script : './dist/app/app.js',
		node_args: '-r dotenv/config --trace-warnings dist/app/app.js dotenv_config_path=.env.qa',
	}],
};
