const { Command } = require('discord.js-commando');

module.exports = class NotionCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'notion',
            group: 'notion',
            memberName: 'notion',
            description: 'Retrieve documentation from the Bankless Notion wiki',
            args: [
                {
                    key: 'text',
                    prompt: 'What text would you like the bot to say?',
                    type: 'string'
                }
            ]
        });
    }

    run(msg) {
        return msg.say('hello notion!');
    }
}