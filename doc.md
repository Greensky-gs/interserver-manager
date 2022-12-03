# Manager Documentation

This is how to use the manager

## Implementation

First, you have to require the manager

```js
const { InterserverManager } = require('interserver-manager');
```

And here you have your manager
Now let's add it to the client

```js
const Discord = require('discord.js');
const MySQL = require('mysql');

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent 
    ]
    // Be sure to add all these intents
});

const db = createConnection({
    database: 'database name',
    password: 'database password',
    user: 'database user',
    host: 'database host'
})

client.interserver = new InterserverManager(client, db);
client.interserver.start();
```

Now the manager is automatically started

## Methods

The manager has three methods : [createInterserver](#createinterserver), [removeInterserver](#removeinterserver) and editFrequence

### createInterserver()

The method creates a new "interserver-socket" in a specific channel, with the possibility to connect another channel to it
The method takes 1 argument, as an object :

```ts
{
    channel: TextChannel; // Channel to create the interserver
    frequence?: string; // Frequence to connect other channels to it (optional)
}
```

It will return a Promise, that returns interserver's informations, under [the return form](#return)
This method can return 5 errors:

* [Error 001](#001)
* [Error 002](#002)
* [Error 003](#003)
* [Error 004](#004)
* [Error 005](#005) in under very rare circumstances

### removeInterserver()

The method delete the "interserver-socket" of a channel.
The method takes 1 argument

```ts
channel: TextChannel
```

If the method success, it returns the data of the channel under [the return form](#return)
The method can return 1 error:

* [Error 006](#006)

### editFrequence()

The method changes the frequence of a channel

The argument of this method is an object:

```ts
{
    channel: TextChannel; // Channel to edit
    frequence: string; // New frequence
}
```

This method can return 3 errors:

* [Error 001](#001)
* [Error 002](#002)
* [Error 006](#006)

## Propreties

The manager give you access to 2 of his propreties

### Client

It simply returns the client that you put in the initialisation

### List

This proprety returns the cache, it is a [Discord Collection](https://discord.js.org/#/docs/collection/main/class/Collection), with this format:

```ts
key: string; // Channel id
data: interserver; // The return form, with guild ID, channel ID, webhook URL and frequence
```

## Utils

Here are some util informations to know if you want to master the manager

### Return

All methods return a Promise

The value returned by a Promise is this :

```ts
{
    channel_id: string; // Id of the channel
    guild_id: string; // Id of the guild
    frequence: string; // Frequence of the interserver-channel
    webhook: string, // Channel's webhook URL
}
```

### Errors

When a Promise returns an error, it has this format :

```ts
{
    message: string; // Error message
    code: string; // Error Code
}
```

#### Error codes

Here are the list of all error codes

* [Error 001](#001)
* [Error 002](#002)
* [Error 003](#003)
* [Error 004](#004)
* [Error 005](#005)
* [Error 006](#006)

###### 001

You have specified a frequence in the [create interserver method](#createinterserver), but this frequence doesn't exist

###### 002

You have specified a frequence in the [create interserver method](#createinterserver), but this frequence his already assigned to a channel in the server

###### 003

The channel already has an interserver

###### 004

The creation of the webhook for the [create interserver method](#createinterserver) failed

###### 005

It is a rare error: no unique frequence has been generated for a new interserver channel

###### 006

The channel isn't an interserver channel for the [remove interserver method](#removeinterserver)
