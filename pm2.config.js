module.exports = {
	apps : [{
		name   : 'DEGEN',
		script : './dist/app/app.js',
		node_args: '-r dotenv/config --trace-warnings dist/app/app.js dotenv_config_path=.env.prod',
		log_date_format: 'YYYY-MM-DD HH:mm Z',
	},
	{
		name   : 'uat-bot',
		script : './dist/app/app.js',
		node_args: '-r dotenv/config --trace-warnings dist/app/app.js dotenv_config_path=.env.qa',
		log_date_format: 'YYYY-MM-DD HH:mm Z',
	}],
};
