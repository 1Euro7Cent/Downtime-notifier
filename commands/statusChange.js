const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../tools')
const prettyMs = require('pretty-ms')

let db = new JsonDB(new Config("database", false, true, '/'))

/**
 * 
 * @param {Client} bot 
 * @param {*} user 
 * @param {*} tUser 
 * @param {*} type 
 * @returns 
 */

function getMessage(bot, user, tUser, type) {
    let t = type == 'online' ? tUser.wentOffline : tUser.wentOnline
    let unshure = bot.uptime < Date.now() - t
    // console.log(t)
    let embed = new MessageEmbed()
        .setTitle(`Bot went ${type}`)
        .setDescription(`The bot \`${user.username}\` is now \`${type}\` `)
        .setColor(type == 'offline' ? 0xff0000 : 0x00ff00)
        .addField(`${type == 'offline' ? 'online' : 'offline'}time`, `\`${t ? prettyMs(Date.now() - t, { verbose: true }) + (unshure ? " (unshure)" : "") : 'Unknown'}\``)
    return {
        embeds: [embed]
    }

}

module.exports = {
    disabled: false,
    noCommand: true,
    /**
     * this runs on startup
     * @param {Client} bot
     */
    async startup(bot) {
        console.log('---- Initializing StatusChangeListener ----')
        bot.on('presenceUpdate', async (oldPresence, newPresence) => {
            if (!oldPresence) return;
            db.reload()
            let data = db.getData('/')
            let gData = data[newPresence.guild.id]
            if (!gData || !gData.broadcastChannel) return;
            for (let user in gData.users) {
                if (gData.users[user].id == newPresence.user.id) {
                    // if the user gone online
                    // todo: write timestamps to db
                    if (oldPresence.status == 'offline' && newPresence.status != 'offline') {
                        let mes = getMessage(bot, newPresence.user, gData.users[user], 'online')
                        console.log(`${newPresence.user.username} went online`)
                        let channel = await bot.channels.cache.get(gData.broadcastChannel)

                        gData.users[user].wentOnline = Date.now()
                        if (channel) {
                            await channel.send(mes)
                        }
                    }
                    // if the user went offline
                    if (oldPresence.status != 'offline' && newPresence.status == 'offline') {
                        let mes = getMessage(bot, newPresence.user, gData.users[user], 'offline')
                        console.log(`${newPresence.user.username} went offline`)
                        let channel = await bot.channels.cache.get(gData.broadcastChannel)

                        gData.users[user].wentOffline = Date.now()
                        if (channel) {
                            await channel.send(mes)
                        }

                    }
                    // data.users = gData.users
                    db.push('/', data)
                }

            }
            db.save()
        })
        // console.log(bot.eventNames())
    },
}