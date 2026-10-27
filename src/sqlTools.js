
/**
 * 
 * @param {import('node:sqlite').DatabaseSync} database 
 * returns {boolean} true if the database is valid, false if not. useful to start migration from json to sqlite if the database is invalid
 */
function checkAndUpdateDatabaseIntegrity(database) {
    // check if the tables exist, if not, return false at the end of the function to indicate that the database is invalid and needs to be migrated from json to sqlite
    const tables = ['guilds', 'users', 'notifications', 'texts']
    let valid = true

    for (let table of tables) {
        const statement = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`)
        const result = statement.all()
        // const result = database.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`)

        if (result.length === 0) {
            console.log(`Table ${table} does not exist, creating...`)
            valid = false
        }

    }


    // generateting the tables required (if missing)


    database.exec(`CREATE TABLE IF NOT EXISTS "guilds" (
        "guildId" TEXT NOT NULL UNIQUE,
        "broadcastChannelId" TEXT
    )`)

    database.exec(`CREATE TABLE IF NOT EXISTS "users" (
        "guildId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "downThreshold" INTEGER NOT NULL DEFAULT 0 CHECK("downThreshold" >= 0),
        "wentOffline" INTEGER,
        "wentOnline" INTEGER,
        PRIMARY KEY("guildId","userId"),
        FOREIGN KEY("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE
        )`)

    database.exec(`CREATE TABLE IF NOT EXISTS "notifications" (
        "guildId" TEXT NOT NULL,
        "mentionUserId" TEXT NOT NULL,
        "watchId" TEXT NOT NULL,
        PRIMARY KEY("guildId","mentionUserId","watchId"),
        FOREIGN KEY("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE
    )`)
    
    database.exec(`CREATE TABLE IF NOT EXISTS "texts" (
        "guildId" TEXT NOT NULL,
        "onlineDescription" TEXT,
        "offlineDescription" TEXT,
        "onlineTitle" TEXT,
        "offlineTitle" TEXT,
        PRIMARY KEY("guildId"),
        FOREIGN KEY("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE
    )`)

    return valid

}

/**
 * 
 * @param {Object} jsonDbData
 * @param {import('node:sqlite').DatabaseSync} sqliteDb 
 */
function migrateDatabaseFromJsonToSqlite(jsonDbData, sqliteDb) {

    // Migrate guilds
    const insertGuild = sqliteDb.prepare(`
        INSERT OR IGNORE INTO guilds (guildId, broadcastChannelId)
        VALUES (?, ?)
    `)

        for (let guild in jsonDbData) {
            // guild is the guild id, jsonDbData[guild] is the guild data
            let broadcastChannel = jsonDbData[guild].broadcastChannel
            if (typeof broadcastChannel === 'string') broadcastChannel = broadcastChannel.trim()
            if (typeof broadcastChannel !== 'string' || !/^\d+$/.test(broadcastChannel)) broadcastChannel = null
            insertGuild.run(guild, broadcastChannel)


            // Migrate users
            if (Array.isArray(jsonDbData[guild].users)) {
                for (let user of jsonDbData[guild].users) {
                    sqliteDb.exec(`INSERT OR IGNORE INTO users (
                        guildId, 
                        userId, 
                        downThreshold, 
                        wentOffline, 
                        wentOnline
                    ) VALUES (
                        '${guild}', 
                        '${user.id}', 
                        ${user.downThreshold || 0}, 
                        ${user.wentOffline || null}, 
                        ${user.wentOnline || null}
                    )`)
                }
            }

            // Migrate notifications
            if (jsonDbData[guild].notifications){
                for (let mentionUserId in jsonDbData[guild].notifications) {
                    for (let watchId of jsonDbData[guild].notifications[mentionUserId]) {
                        if (watchId === "all"){

                            for (let user of jsonDbData[guild].users) {
                                sqliteDb.exec(`INSERT OR IGNORE INTO notifications (
                                    guildId, 
                                    mentionUserId, 
                                    watchId
                                ) VALUES (
                                    '${guild}', 
                                    '${mentionUserId}', 
                                    '${user.id}'
                                )`)
                            }

                        } 
                        else{
                            sqliteDb.exec(`INSERT OR IGNORE INTO notifications (
                                guildId, 
                                mentionUserId, 
                                watchId
                            ) VALUES (
                                '${guild}', 
                                '${mentionUserId}', 
                                '${watchId}'
                            )`)
                        }

                    }
                }
            }

            // Migrate texts
            if (jsonDbData[guild].texts){
                sqliteDb.exec(`INSERT OR IGNORE INTO texts (
                    guildId, 
                    onlineDescription, 
                    offlineDescription, 
                    onlineTitle, 
                    offlineTitle
                ) VALUES (
                    '${guild}', 
                    '${jsonDbData[guild].texts.onlineDescription || null}', 
                    '${jsonDbData[guild].texts.offlineDescription || null}', 
                    '${jsonDbData[guild].texts.onlineTitle || null}', 
                    '${jsonDbData[guild].texts.offlineTitle || null}'
                )`)
            }

        }


}

module.exports = { checkAndUpdateDatabaseIntegrity,migrateDatabaseFromJsonToSqlite }