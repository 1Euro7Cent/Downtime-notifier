## Requirements

- A [brain](https://www.youtube.com/watch?v=xvFZjo5PgG0)
- [nodejs v16+](https://nodejs.org/en/)
- A [discord app](https://discord.com/developers/applications)

## Installation

- first install dependencies `npm install`

- run the bot once (`node index.js`) and the bot will crate all files

- edit `config.json`:

```json
{
  "token": "get your token at https://discord.com/developers/applications",
  "logs": {
    "crash": "crash{date}.log"
  }
}
```

- make shure that is on
  ![image](https://user-images.githubusercontent.com/67194495/161727938-d7818d27-5c69-4b6f-aab2-cace11730462.png)

- now you can start the bot with `node index.js`

## additonal information

- public bot [invite link](https://discord.com/api/oauth2/authorize?client_id=818105614055112715&permissions=18432&scope=bot%20applications.commands)

- if you have the V1 version, and you want to migrate the db to v2 (this)
  you can use the following steps:

* - Rename the db to "oldDb.json"
* - and run "node migrateDb.js"
* - there should be a new file called "newDb.json". That is the migrated db.
* - now rename that to "database.json"
