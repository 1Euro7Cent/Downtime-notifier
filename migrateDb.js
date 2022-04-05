// @ts-nocheck
const fs = require('fs')


let oldDb = fs.readFileSync('./oldDb.json')
oldDb = JSON.parse(oldDb)
let newDb = {}
for (let g in oldDb.guild) {
    newDb[g] = {}
    newDb[g].broadcastChannel = oldDb.guild[g].brodcastChannel
    if (!newDb[g].users) newDb[g].users = []
    for (let b in oldDb.guild[g].bots) {
        newDb[g].users.push({
            id: b,
            wentOffline: oldDb.guild[g].bots[b].offlineTimestamp,
            wentOnline: oldDb.guild[g].bots[b].onlineTimestamp
        })
    }

}
fs.writeFileSync('./newDb.json', JSON.stringify(newDb, null, 2))