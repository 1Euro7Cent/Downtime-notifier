const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')
// database stuff
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../src/tools')

module.exports = {
    disabled: false,
    noCommand: false,
    data: new SlashCommandBuilder()
        .setName('get')
        .setDescription('Lists all the bots and mentions that are in the database.')
    ,
    cooldown: 60000, // 60 seconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {import('node:sqlite').DatabaseSync} database
     */
    async execute(bot, interaction, database) {
        // let db = new JsonDB(new Config("database", true, true, '/'))
        /*
        let data = db.getData('/')
        // @ts-ignore
        let guildData = data[interaction.guild?.id]
        if (!guildData) return await interaction.reply('No data found for this guild')
        //*/

        await interaction.deferReply()

        let desc = ''

        let broadcastChannelID = database.prepare('SELECT broadcastChannelId FROM guilds WHERE guildId = ?').get(interaction.guild.id)?.broadcastChannelId

        // broadcast channel
        // let broadcastChannel = await interaction.guild?.channels.cache.get(broadcastChannelID)
        let broadcastChannel = await interaction.guild.channels.fetch(broadcastChannelID)
        if (broadcastChannel) {


            // @ts-ignore
            let sendPermissions = tools.hasPermissionToSendMessages(broadcastChannel)

            desc += `Broadcast channel: \`${broadcastChannel.name}\` (${broadcastChannel})\n`

            desc += `Send permissions: ${sendPermissions ? "✅" : "❌"}\n\n`
        } else {
            desc += `Broadcast channel: \`${broadcastChannel} (not found in guild)\`\n\n`
        }

        // users
        let users = database.prepare("SELECT * FROM users WHERE guildId = ?").all(interaction.guild?.id)
        // let users = guildData.users

        for (let u in users) {
            bot.users.fetch(users[u].userId).catch(e => null)
            let user = await interaction.guild?.members.cache.get(users[u].userId)
            if (user) {
                desc += `${user.user}: \`${user.presence?.status ? user.presence?.status : 'Unknown'}\`\n`
            } else {
                desc += `\`${users[u].id}\`: \`not found\`\n`
            }

            // add downtime threshold if exists
            if (users[u].downThreshold) desc += `   - Downtime threshold: \`${users[u].downThreshold + ' seconds'}\`\n`
        }

        // notifications

        desc += '\nmentions:\n'
        // let notifications = guildData.notifications

        let notifications = database.prepare("SELECT * FROM notifications WHERE guildId = ? ORDER BY mentionUserId ASC").all(interaction.guild?.id)

        /**
         * @type {string[]}
         */
        let alreadyNotifyingUsers = []

        for (let n of notifications) {
            let notify = n.mentionUserId
            let notifyingUser = await interaction.guild?.members.cache.get(notify)

            if (!alreadyNotifyingUsers.includes(notify)) {

                if (notifyingUser) desc += `\n${notifyingUser.user} will be mentioned when:\n`
                else desc += `\n\`${notify}\` will be mentioned when:\n`
                alreadyNotifyingUsers.push(notify)
            }




            let notifyUser = await interaction.guild?.members.cache.get(n.watchId)
            if (notifyUser) desc += `   - ${notifyUser} goes offline / offline\n`
            else desc += `  - \`${n.watchId}\` goes offline/ offline\n`


        }


        if (desc.length > 2000) {
            // create a file and send it
            fs.writeFileSync(`./temp/${interaction.guild?.id}.txt`, desc)
            await interaction.reply({
                files: [
                    `./temp/${interaction.guild?.id}.txt`
                ]
            })
            fs.unlinkSync(`./temp/${interaction.guild?.id}.txt`)


        }
        else {
            await interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Watchlist')
                        .setDescription(desc)
                        .setColor(0x00ff00)
                ]
            })
        }

    }
}