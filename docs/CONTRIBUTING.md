# Contribution Guidelines

To facilitate efficient development, it will be helpful to run your own bot
on our test server. We have test versions of Notion and a MongoDB instance.
To get setup, please follow these guidelines:

## Create your own bot to use in your local dev environment

1. Visit the [Discord Developer Portal](https://discord.com/developers/applications)
2. Sign in with your Discord credentials
3. Create a new application, call it whatever you want
4. On the left, select "Bot" and create a bot user
5. Switch on "Presence Intent" and "Server Members Intent"
6. Save your changes
7. On the left, select "OAuth2"
8. Under "Scopes", select "bot"
9. Permissions. Enable only these permissions:

-   Manage Roles
-   Manage Channels
-   Kick Members
-   Ban Members
-   Manage Emojis & Stickers
-   Manage Webhooks
-   View Channels
-   All of the permissions under "Text Permissions"
-   No permissions under "Voice Permissions"

10. Select and copy the generated URL under "Scopes." Make sure the you have [these permissions](https://github.com/BanklessDAO/discord-bots/blob/DEGEN/docs/BOT_PERMISSIONS.md) selected.
11. Send the URL via Discord DM to nonsense to have it added to the test
    Discord server

## Clone the repo to local

1. Create a new feature branch from the dev branch (`docs/<name>`, `feature/<name>`, `release/<name>`, `hotfix/<name>`).
2. Copy the `.env.template` file and name it `.env`;
3. Request the test Notion token and MongoDB URI from one of the repo
   maintainers, copy your bot's token (found under the bot tab in the
   developer's portal) and replace the relevant values in your copied .env
   file, making sure to update the file name where it is required in `app.js`
4. `yarn start` will run the prestart script to get everything installed and running.
5. Run your bot and test your connections.
6. Whenever you're ready for a pull request, open a pr with `dev` branch.

## Develop!

Work on your features/assignments. Tests should be written for new features
that are added. We are using Jest as the test library, so please familiarize
yourself with Jest if you are not already familiar with it. If you need help
with writing tests, please ask, as we have a couple devs on board who have
experience in this area.

When you feel the feature is ready to be battle tested, lint and test your
code and run it through Prettier prior to pushing it. Submitting a PR will
trigger this workflow anyway. However, the less we have to do to fix merge
conflicts and failed workflows, the better.

Once the branch is ready to be merged, push it to the repo and create a PR
to the dev branch. From this point, it will follow the details set out in
WORKFLOW.md.
