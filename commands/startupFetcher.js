const { Client, CommandInteraction, MessageEmbed, TextChannel } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../tools')
const prettyMs = require('pretty-ms')

module.exports = {
    disabled: false,
    noCommand: true,
    /**
     * this runs on startup
     * @param {Client} bot
     * @param {JsonDB} db
     */
    async startup(bot, db, errorMessager) {
        console.log('---- Fetcher startup ----')
        let start = Date.now()
        // let db = new JsonDB(new Config("database", false, true, '/'))
        let data = db.getData('/')
        for (let guild_ in data) {
            let guildData = data[guild_]

            process.stdout.write(`fetching guild ${guild_}... `)
            let guild = bot.guilds.cache.get(guild_)
            if (!guild) {
                console.log('ERROR')
                // remove guild from db
                delete data[guild_]
                continue
            }
            console.log('OK')

            let missing = []
            for (let user of guildData.users) {
                // missing.push(user)
                // continue
                process.stdout.write(`  fetching user ${user.id}... `)

                let fetched = await bot.users.fetch(user.id).catch(e => null)
                if (!fetched) {
                    console.log('ERROR')
                    // console.log(e)
                    // remove user from watchlist
                    guildData.users = guildData.users.filter(u => u.id != user.id)
                    missing.push(user)
                    continue
                }

                console.log(`OK`)

            }


            if (missing.length > 0) {
                // if broadcast channel is set, send message that users were removed
                if (guildData.broadcastChannel) {
                    /**
                    * @type {TextChannel}
                    */

                    // @ts-ignore
                    let channel = await bot.channels.cache.get(guildData.broadcastChannel)
                    if (channel) {
                        let desc = "The following bots were not found anymore and removed from the watchlist:"

                        for (let user of missing) {
                            desc += `\n<@!${user.id}> (\`${user.id}\`)`
                        }

                        let embed = new MessageEmbed()
                            .setTitle('User removed from watchlist')
                            .setDescription(desc)
                            .setColor(0x00ff00)

                        await channel.send({ embeds: [embed] }).catch(e => errorMessager(channel, e))

                    }
                }
            }


        }
        db.push('/', data)
        db.save()
        console.log(`Took: ${prettyMs(Date.now() - start)}`)
        console.log('---- Fetcher startup complete ----')
    },
}