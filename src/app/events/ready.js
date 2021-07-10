/**
 * Handler for Discord event `ready`.
 */

const GuestPassService = require('../service/GuestPassService.js');

module.exports = {
    once: true,
    execute(client) {
        console.log('Ready!');
        client.user.setActivity('Going Bankless, Doing the DAO');
        GuestPassService(client);
    }
}