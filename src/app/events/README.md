# Events

This directory contains event handlers for Discord events. Each handled Discord 
event must have a file in this directory named *exactly* like the Discord event 
that is emitted, e.g. `guildMemberAdd.js` handles the Discord event 
`guildMemberAdd`. Files in this folder will automatically be registered to 
listen to the Discord event that the file is named.

A full list of available Discord events can be found on the
[discord.js documentation](https://discord.js.org/#/docs/main/stable/class/Client).

Evant handlers are structured as follows:
```javascript
module.exports = {
    /*
     * Optional field. Indicates if this is a once time listener. If true, event
     * will be registered to listen for `client.once` instead of `client.on`
     */
    once: true

    /* 
     * Function that is called when event is emitted, Different events pass in a 
     * varying number of arguments. See discord.js documentation for arguments 
     * returned by emitted events. Client can be omitted as a function parameter 
     * if it is not used. 
     */
    execute(...args, client) { 
        // Code to handle event
    }
}
```