const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const { ShardingManager } = require('discord.js');

const sqlTools = require('./src/sqlTools')


const config = require('./config.json')



const database = new DatabaseSync(`./${config.db.filePath}`)

database.exec('PRAGMA journal_mode = WAL;');
database.exec('PRAGMA busy_timeout = 5000;');

console.log('Checking database integrity...')

let isDatabaseValid = sqlTools.checkAndUpdateDatabaseIntegrity(database)

if (!isDatabaseValid && fs.existsSync('./database.json')) {
    console.log('Database is invalid, migrating from json to sqlite...')
    
    let jsonDbData = JSON.parse(fs.readFileSync('./database.json', 'utf-8'))

    sqlTools.migrateDatabaseFromJsonToSqlite(jsonDbData, database)

    // assume the migration was successful and the database is now valid. renaming the database.json file to database.json.bak to indicate that it has been migrated and is no longer needed
    fs.renameSync('./database.json', './database.json.bak')
    console.log('Migration complete. Database is now valid.')

}


const manager = new ShardingManager('./index.js', {
    token: config.token,
    // totalShards: "auto",
    totalShards: config.shards.totalShards ?? "auto",
    respawn: config.shards.respawn,
})

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));
manager.spawn();
