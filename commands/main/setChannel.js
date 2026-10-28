const { Client, CommandInteraction, MessageEmbed, Permissions, TextChannel } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// database stuff
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const { ChannelType } = require('discord-api-types/v10')

const tools = require('../../src/tools')


module.exports = {
    disabled: false,
    noCommand: false,
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Sets the broadcast channel for the watchlist.')
        .addChannelOption(option => {
            option.setName('channel')
                .setDescription('the channel to set the broadcast channel to')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews)

            return option
        })
    // .addChannelOption(builder => {
    //     builder.setName('channel')
    //         // .setRequired(true)
    //         .setDescription('the channel to set')
    //         .addChannelType(0)

    //     return builder
    // })
    ,
    cooldown: null, // milliseconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {import('node:sqlite').DatabaseSync} database
     */
    async execute(bot, interaction, database) {
        // @ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            /**
             * @type {TextChannel}
             */
            // @ts-ignore
            let channel = interaction.options.getChannel('channel')

            // check if we have permission to send messages in the channel

            if (!channel) {
                // remove the channel
                database.prepare("UPDATE guilds SET broadcastChannelId = NULL WHERE guildId = ?").run(interaction.guild.id)
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Success')
                            .setDescription(`The broadcast channel has been removed.`)
                            .setColor(0x00ff00)
                    ]
                })
            }
            else {
                // permiossion check

                if (!tools.hasPermissionToSendMessages(channel)) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Error')
                                .setDescription(`I don't have permission to send messages in \`${channel?.name}\``)
                                .setColor(0xff0000)
                        ]
                    })
                    return
                }

                let guildIsInsideDB = database.prepare("SELECT * FROM guilds WHERE guildId = ?").get(interaction.guild?.id)
                if (!guildIsInsideDB) {
                    database.prepare("INSERT INTO guilds (guildId, broadcastChannelId) VALUES (?,?)").run(interaction.guild?.id, channel.id)
                }
                else {
                    database.prepare("UPDATE guilds SET broadcastChannelId = ? WHERE guildId = ?").run(channel.id, interaction.guild.id)
                }

                await interaction.reply({
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
            await interaction.reply({
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