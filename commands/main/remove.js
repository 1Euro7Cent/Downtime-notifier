const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('removes a bot from the watchlist')
        .addUserOption(builder => {
            builder.setName('user')
                .setRequired(true)
                .setDescription('the user to remove')

            return builder
        })
    ,
    cooldown: null, // milliseconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     */
    execute(bot, interaction) {
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let user = interaction.options.getUser('user')
            let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: []
            }
            let users = gData.users.filter(u => u.id == user.id)
            if (users.length == 0) {

                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`User \`${user.username}\` is not in the watchlist`)
                            .setColor(0xff0000)
                    ]

                })
                return
            }

            gData.users = tools.removeElemByName(gData.users, users[0])

            db.push('/', data)

            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`\`${user.username}\` has been removed from the watchlist.`)
                        .setColor(0x00ff00)
                ]
            })
        }
        else {
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Error')
                        .setDescription('You need the **Manage Server** permission to use this command')
                        .setColor(0xff0000)
                ]
            })
        }
    },
}