# Install

This discord bot develop is platform agnostic. It can be installed locally on windows, or unix systems where the discord
application is available.

These tools can make development quick and are recommended:

-   [git CLI](https://git-scm.com) - version control system
-   [Docker](https://docs.docker.com/desktop/) - for local development
-   [iterm2](https://iterm2.com/) - enhanced terminal for macOS
-   [discord](https://discord.com/) - popular chat application used for gaming and organized communities

## Configuration Setup

Before the bot is ready to run there are a few configuration items that should be done. First few steps can be done following
the [discord.js guide](https://discordjs.guide/#before-you-begin);

### 1. Create environment file

Please create a `.env` with the keys below

```
DISCORD_BOT_TOKEN=<taken from discord bot applciation page>
DISCORD_OWNER_ID=<taken from discord app in TEST mode>
MONGODB_URI=<local or web url of mongo db>
NOTION_TOKEN=<generated from notion integrations page>
FAQS_PAGE_ID=<personal FAQS page>
```

### 2. Generate bot token

[https://discordjs.guide/preparations/setting-up-a-bot-application.html](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
Create your own discord application and then create your own bot API key.

Retrieve the App's client ID
![](images/create_app.png)

Retrieve the bot token
![](images/create_bot.png)

### 3. Invite bot to your personal discord

[https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)
The newly created bot should be invited to your own discord space/server.

```
https://discord.com/oauth2/authorize?client_id=REPLACE_THIS_HERE&scope=bot+applications.commands
```

### 4. Enable Developer Mode

There should be a small cog near your icon photo labeled "User Settings". Hitting that there should be an option to enable
developer mode
![](images/discord_developer_mode.png)

### 5. Create Notion Integration

[https://developers.notion.com/docs/getting-started](https://developers.notion.com/docs/getting-started)

![](images/notion_integration.png)

### 6. Run application

```bash
docker-compose up
```
