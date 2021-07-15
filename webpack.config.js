const path = require('path');

module.exports = {
	entry: './src/app/app.js',
	target: 'node',
	mode: 'development',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
		fallback: {
			'ffmpeg-static': false,
			'../package': false,
		},
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
	},
};