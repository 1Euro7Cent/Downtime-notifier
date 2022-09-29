const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')
// database stuff
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    noCommand: false,
    data: new SlashCommandBuilder()
        .setName('get')
        .setDescription('Lists all the bots that are in the watchlist')
    ,
    cooldown: 5000, // 5 seconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {JsonDB} db
     */
    async execute(bot, interaction, db) {
        // let db = new JsonDB(new Config("database", true, true, '/'))
        let data = db.getData('/')
        let guildData = data[interaction.guild.id]
        if (!guildData) return interaction.reply('No data found for this guild')
        await interaction.deferReply()

        let desc = ''

        // broadcast channel
        let broadcastChannel = await interaction.guild.channels.cache.get(guildData.broadcastChannel)
        if (broadcastChannel) {


            // @ts-ignore
            let sendPermissions = tools.hasPermissionToSendMessages(broadcastChannel)

            desc += `Broadcast channel: \`${broadcastChannel.name} (${guildData.broadcastChannel})\`\n`

            desc += `Send permissions: ${sendPermissions ? "✅" : "❌"}\n\n`
        } else {
            desc += `Broadcast channel: \`${guildData.broadcastChannel} (not found in guild)\`\n\n`
        }

        // users
        let users = guildData.users
        for (let u in users) {
            let user = await interaction.guild.members.cache.get(users[u].id)
            if (user) {
                desc += `${user.user}: \`${user.presence?.status ? user.presence?.status : 'Unknown'}\`\n`
            } else {
                desc += `\`${users[u].id}\`: \`not found\`\n`
            }
        }

        // notifications

        desc += '\nPings:\n'
        let notifications = guildData.notifications
        for (let n in notifications) {
            let notify = n
            let notifyingUser = await interaction.guild.members.cache.get(notify)

            if (notifyingUser) desc += `\n${notifyingUser.user} will be pinged when:\n`
            else desc += `\n\`${notify}\` will be pinged when:\n`

            let notifyUsers = notifications[notify]
            for (let nu of notifyUsers) {
                if (nu == 'all')
                    desc += `   - \`any user\` goes offline/ online\n`
                else {
                    let notifyUser = await interaction.guild.members.cache.get(nu)
                    if (notifyUser) desc += `   - ${notifyUser} goes offline / offline\n`
                    else desc += `  - \`${nu}\` goes offline/ offline\n`
                }
            }
        }


        if (desc.length > 2000) {
            // create a file and send it
            fs.writeFileSync(`./temp/${interaction.guild.id}.txt`, message)
            await interaction.reply({
                files: [
                    `./temp/${interaction.guild.id}.txt`
                ]
            })
            fs.unlinkSync(`./temp/${interaction.guild.id}.txt`)


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