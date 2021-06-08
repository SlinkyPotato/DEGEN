const { Client } = require("@notionhq/client");
// const notion = require('./notion/Notion.js');

const notion = new Client({
    auth: process.env.NOTION_TOKEN
});

module.exports = notion;
