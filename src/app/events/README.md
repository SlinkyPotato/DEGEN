# Events

This directory contains event handlers for Discord events. Files in this folder will automatically 
be registered to listen to the Discord event specified by `name`.

A full list of available Discord events can be found on the
[discord.js documentation](https://discord.js.org/#/docs/main/stable/class/Client).

Event handlers are structured as follows:
```typescript
export default class implements DiscordEvent {
    /*
     * Name of the Discord event to handle.
     */
    name = 'guildMemberAdd';

    /*
     * Optional field. Indicates if this is a one time listener. If true, event
     * will be registered with `client.once` instead of `client.on`
     */
    once = true;

    /* 
     * Function that is called when event is emitted, Different events pass in a 
     * varying number of arguments. See discord.js documentation for arguments 
     * returned by emitted events. Client can be omitted as a function parameter 
     * if it is not used. 
     */
    async execute(...args) { 
        // Code to handle event
    };
}
```