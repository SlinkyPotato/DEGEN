# Changelog

## 1.3.0-SNAPSHOT
1. Add queue for requests to Notion

## 1.2.1-RELEASE (2021-08-12)

1. Allow larger criteria regex
2. upper case bank values for reward

## 1.2.0-RELEASE (2021-08-12)

1. Add Bounty slash command
2. Add more unit cases for commands
3. Add emoji support for bounties posted in #🧀-bounty-board channel
   - restructure codebase
   - add more logging
4. Fix guest pass event service
5. More bug fixes for bounty board commands and flow, add refresh button!
6. Add /bounty list drafted by me, add edit reaction to drafted bounties
7. Allow dashes in criteria and allow only BANK tokens
8. Sync bounties posted by webhook
9. Recreate bounty boards for webhook created posts
10. Allow much more special characters in description

## 1.1.1-RELEASE (2021-07-28)

1. Handle all notion api calls in case of rate limit or out of sync errors

## 1.1.0-RELEASE (2021-07-21)

1. Integrate slash commands
2. Add typescript integration and reorder events initialization
3. Fix raw event failure, add support for multiple databases

## 1.0.0-RELEASE (2021-07-09)

1. Add notion faq bot command
2. Add github qa deployment integration
3. Add eslint and prettier configurations
4. Add status checked for github actions on linting and prettier
5. Add server roles, guest pass access and time limit
