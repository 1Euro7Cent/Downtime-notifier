## Requirements

- A [brain](https://www.youtube.com/watch?v=xvFZjo5PgG0)
- [nodejs v16+](https://nodejs.org/en/)
- A [discord app](https://discord.com/developers/applications)

## Installation

- first install dependencies `npm install`

- run the bot once (`node index.js`) and the bot will create all files

- edit `config.json`:

```json
{
  "token": "get your token at https://discord.com/developers/applications",
  "logs": {
    "crash": "crash{y}.{m}.{d}-{h}_{i}.{s}.log"
  },
  "statuses": [
    "If i am not working, ping me for info",
    "{guilds} servers | /help",
    "Managing {manageGuilds} servers | /help",
    "Listening to {manageUsers} bots | /help",
    "Average downtime: {avgDowntimePRETTY} | /help",
    "Average uptime: {avgUptimePRETTY} | /help",
    "Made by mrballou#9055 and contributors | /help"
  ]
}
```

- make shure that is on
  ![image](https://user-images.githubusercontent.com/67194495/161727938-d7818d27-5c69-4b6f-aab2-cace11730462.png)

- now you can start the bot with `node index.js`

## TOS

(I mainly need this because of discord)

- Follow the [Discord TOS](https://discordapp.com/terms)
- Do not spam/abuse the bot

## Privacy Policy

- I collect/store data about the guilds(guild ID) and ADDED users.

This includes:

- Guild ID (to assign the rest of the data).
- Broadcast channel ID (to be able to know what channel to send the notification to).
- Bot data:
  - user ID (to know for what user to send notification)
  - timestamps (to be able to know for how long the bot has being online / offline):
    - gone online (milliseconds)
    - gone offline (milliseconds)

For the purpose of being able to notify users that bots turned offline / online.
You can see the data in the `database.json` file or via the `data get` command.

- If you want to completly wipe the data from that guild, use the `data delete` command.
- If the bot was kicked from the server and on the next boot the bot deletes all data from missing guilds / bots.

## Additonal information

- public bot [invite link](https://discord.com/api/oauth2/authorize?client_id=818105614055112715&permissions=18432&scope=bot%20applications.commands)

- profile picture by [JBugel#0001](https://github.com/Vibecord)

- if you have the V1 version, and you want to migrate the db to v2 (this)
  you can use the following steps:

  - Rename the db to `oldDb.json`
  - and run `node migrateDb.js`
  - there should be a new file called `newDb.json`. That is the migrated db.
  - now rename that to `database.json`
