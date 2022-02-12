const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// database stuff
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')


module.exports = {
    disabled: false,
    noCommand: false,
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('sets the broadcast channel for the watchlist')
        .addChannelOption(builder => {
            builder.setName('channel')
                // .setRequired(true)
                .setDescription('the channel to set')
                .addChannelType(0)

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
            let channel = interaction.options.getChannel('channel')

            let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: []
            }
            // check if we have permission to send messages in the channel

            if (!channel) {
                // remove the channel
                gData.broadcastChannel = null
                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Success')
                            .setDescription(`The broadcast channel has been removed.`)
                            .setColor(0x00ff00)
                    ]
                })
            }
            else {
                if (!channel.permissionsFor(bot.user).has('SEND_MESSAGES')) {
                    interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Error')
                                .setDescription(`I don't have permission to send messages in \`${channel?.name}\``)
                                .setColor(0xff0000)
                        ]
                    })
                    return
                }
                gData.broadcastChannel = channel.id
            }

            data[interaction.guild.id] = gData
            db.push('/', data)
            if (gData.broadcastChannel) {
                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`Success`)
                            .setDescription(`\`${channel?.name}\` has been set as the broadcast channel.`)
                            .setColor(0x00ff00)
                    ]
                })
            }
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