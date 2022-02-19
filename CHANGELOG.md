# Changelog

## 2.9.0

1. Connect Wallet with `/connect` command.
2. Read currently connected wallet with `/wallet` command.

## 2.8.0

1. Remove poap delivery via dm, store poap for user
2. Add platform to `/claim`
3. Rename isDMEnabled flag -> isWalletDeliveryEnabled
   - add ethWalletSettings to discordUsers
   - disable DM delivery
4. Update poap expiration only for dates longer than 24 hours
5. Fix duplicate poap assignment
6. Enhance poap claim flow
7. Remove isDMOn from all files
8. Add logging to DB connection

## 2.7.0-RELEASE (2022-01-18)

1. Add more stability to opt-in messages
2. Add account commands
   - /account link (renamed from /account verify)
   - /account list
   - /account unlink
3. Restrict DEGEN to certain discord servers
4. Upgrade discord.js -> 13.6.0, upgrade slash-create -> 5.0.3
5. Introduce basic `/claim` command and prompt user for opt-in on slash command
6. Increase poap max time to 12 hours
7. Add poap expiration cron job
8. Enhance poap distribution to with ephemeral
   - fix timeout reply after poap distribution
   - enhance poap distribution loop
   - enhance poap end
9. Parse blank strings for msg embed display
10. Prompt users to DM delivery is /claim is executed from channel
11. Message enhancements to twitter flow

## 2.6.2-RELEASE (2022-01-13)

1. Handle twitter spaces exceptions
   - update twitter settings schema validation
   - add log msg for twitter flow
   - stability enhancements

## 2.6.1-RELEASE (2022-01-11)

1. Fix prod keys

## 2.6.0-RELEASE (2022-01-11)

1. Stability check
   - add sentry github action
   - fix poap mint api call
   - fix auto end for DM event
   - fix gm regex for single line
   - refactor poap start/stop tracking event
2. Twitter stability check
   - handle timeout for autoend situation
   - better error messaging
   - stability enhancements
   - add forced start script
3. Fix key github action reference for twitter spaces
   - remove extra logging
   - send twitter auth confirmation only on direct auth flow

## 2.5.2-RELEASE (2022-01-09)

1. Address sentry.io issues 2022-01-08
   - add type guards to messageCreate sentry method
   - handle failed to send poap message edge case
   - upgrade discord.js -> 13.5.1
   - upgrade slash-create -> 5.0.2

## 2.5.1-RELEASE (2022-01-07)

1. Manually assign DSN, reference bot for gm message, add discord server on event

## 2.5.0-RELEASE (2022-01-03)

1. Integrate sentry.io
   - misc message enhancements
2. Restructure POAP delivery
   - send POAPs on gm message
   - store discord server and user settings
   - provide opt-in for DMs
   - set poap post claim expiration to 24 hours
   - configure poap access in secret
   - allow poap participants to report poap organizers
   - disable poap commands for bad poap organizers
   - display additional distribution results info
   - reorganize code
3. Setup new bot

## 2.4.1-RELEASE (2021-12-20)

1. Remove memory bottleneck for poap claim
2. Add catch block for poap participants
3. Fix duration

## 2.4.0-RELEASE (2021-12-14)

1. Enable twitter flow in channel
2. Enable tsconfig strict option
3. Misc cleanup and stability enhancements
4. Extend poap claim to 24 hours

## 2.3.0-RELEASE (2021-12-07)

1. Enable poap scheduling (POAP API integration)
2. Remove Datadog
3. Enable poap config via channel flow
4. Add poap config status command to display list of authorized users and roles
5. Rename `/poap schedule` -> `/poap mint`
6. Enable POAP distribution
   - reduce poap claim deleted to 5 minutes
   - display poap claimed message
   - fix poap duration for auto end events
7. Clear expired POAPs on startup
   - surround error log in try/catch block
8. Add a security check for the poap urls that are passed
   - default platform to discord
9. Fix poap mint name variable

## 2.2.0-RELEASE (2021-11-30)

1. Send hidden claim messages for POAPs
2. Fix distribution of failed attendees
3. Display support error message on failure
4. Channel-only flow for POAP starting
5. Disable poap config, poap distribute, account verify

## 2.1.0-RELEASE (2021-11-23)

1. Add Privacy Policy and Terms & Conditions to /docs
2. Add help for /poap claim
3. Prepare twitter spaces command
   - end poap events cleanly on startup or restart of instance
   - remove period from poap link

## 2.0.2-RELEASE (2021-11-22)

1. Fix auto-end for poap events

## 2.0.1-RELEASE (2021-11-22)

1. Store duration for end of poap event

## 2.0.0-RELEASE (2021-11-22)

1. Remove non-poap features
2. Tweet spaces event upon startup
   - organize datadog
   - complete /poap start platform:twitter
   - complete /poap end
   - misc enhancements
3. Disable twitter spaces (wip)
4. Enabled twitter spaces (wip), enhance and stabilize poap events
5. End Twitter event, distribute, and claim
6. Disable twitter spaces

## 1.9.4-RELEASE (2021-11-18)

1. Add datadog tracer

## 1.9.3-RELEASE (2021-11-12)

1. Add try/catch block to buffering
   - display logdna error if missing token

## 1.9.2-RELEASE (2021-11-10)

1. Fix auto end for poap events
   - update help docs with links

## 1.9.1-RELEASE (2021-11-09)

1. Allow poap claiming from DM
   - enable claim validation and extent to 30 characters

## 1.9.0-RELEASE (2021-11-08)

1. Add guildId to bounty
2. Add twitter spaces integration (wip)
   - refactor MongoDbUtils file
   - add POAP schedule error messaging
   - setup POAP claiming for failed delivery
   - remove deaf users for poap events
   - organize error message validations
   - add workflow env keys
3. Fix redelivery for failed participants
   - add custom start messages

## 1.8.4-RELEASE (2021-11-03 - 2021-11-07)

1. Introduce /coordinape form request command for BanklessDAO
2. Update feedback request form to canny
3. Add /timecard command
4. Run build-test action on every pull request
5. Allow multiple coordinape usages for command
6. /coordinape form request command: Treat level3 and level 4 roles equal to level 1 role.

## 1.8.3-RELEASE (2021-10-26)

1. Check rate limit
2. Fix github actions for forked repos
3. Set guestpass limit for 2 weeks instead of 1 week

## 1.8.2-RELEASE (2021-10-23)

1. Fix poap attendee duration time
2. Fix failed to send poaps message

## 1.8.1-RELEASE (2021-10-21)

1. Fix removal of guest pass users by wraping in try/catch block in case of error
2. Add DEGEN branch deployment to uat

## 1.8.0-RELEASE (2021-10-21)

1. Fix scoap-squad and update start season 2
2. Integrate with logDNA sdk, turn off native console.log
   - fix CODE_OWNERS file
   - fix `/poap schedule` command
   - misc enhancements
   - configure poap time to env variable
   - set min poap participate time to 10 mins
   - display guild name and event for poap distribution message
   - send message on instructions for POAP approval
   - enable `/scoap-squad` in BanklessDAO
3. Add option to automatically end poap events
   - format poap start and end messages
   - fix guest pass auto removal
4. Return csv of failed participants at end of event
5. Extend `/poap config` to guild/server managers

## 1.7.2-RELEASE (2021-10-12)

1. Update deployment actions for pre-release and DEGEN
2. Update yarn lockfile

## 1.7.1-RELEASE (2021-10-12)

1. Update slash-create dependency

## 1.7.0-RELEASE (2021-10-11)

1. Add scoap-squad feature for BanklessDAO
2. Add /poap schedule command
   - enhance stability
   - wrap events call to bankelss DAO server
   - misc text message updates
3. Setup Major Motoko Kusanagi bot
4. Fix MessageCreate event
5. Open bounties to all (except creating new bounties)
6. Remove voice permissions

## 1.6.0-RELEASE (2021-10-01)

1. Fixed RetrieveFAQs tests to properly use mocking and fix yarn linting script
2. Misc fixes for POAP commands and enable HELP commands for all discords
3. Migrate github actions deployment to digital ocean droplet
4. Add username spam filter
5. Misc fixes for bounties
6. Reference production environment files
7. Enhance stability of DEGEN

## 1.5.2-RELEASE (2021-09-10)

1. Extend to 25+ voice channels for /poap start

## 1.5.1-RELEASE (2021-09-10)

1. Manually add registered servers for /help and /poap commands (needs to be looked into)

## 1.5.0-RELEASE (2021-09-09)

1. Convert event modules to classes
2. Fix guest event partials
3. Expand poap distribution to all voice channels
4. Add config for poap commands

## 1.4.0-RELEASE (2021-08-31)

1. Fix docker db connection
2. Use mongodb connection pools
3. Expand bounty copies to lvl2+
4. Add Pradhumna Pancholi#3700 to POAP manager list
5. Allow lvl2+ contributors, admin, and genesis squad to use /poap command

## 1.3.2-RELEASE (2021-08-27)

1. Wrap all of guildmember in try/catch block

## 1.3.1-RELEASE (2021-08-27)

1. Fix for when a user is banned during call

## 1.3.0-RELEASE (2021-08-26)

1. Add queue for requests to Notion
2. Add Dev Guild welcome mat
3. Removed `api` directory in favor of `service` directory
4. Upgrade discord.js v12 -> v13
5. Add /help bounty, fix grammar for text, simplify bot commands
6. Capture bounty description and criteria from bot interaction messages
7. Allow publication of the same bounty multiple times for level 3+ users
8. Add POAP tracking command for CC call
9. Extend POAP tracking for writer's guild
10. Upgrade commands to ES6 and clean up testing

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
