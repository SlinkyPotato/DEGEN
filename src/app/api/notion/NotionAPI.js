const axios = require('axios');

const notionAPI = axios.create({
	baseUrl: 'https://api.notion.com/v1/',
	timeout: 5000,
	headers: {
		'Notion-Version': '2021-05-13',
		Authorization: process.env.NOTION_TOKEN,
	},
});

module.exports = notionAPI;