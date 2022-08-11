const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')
const fs = require('fs')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('getdata')
        .setDescription('Gets the collected data of this guild')
    ,
    cooldown: 10 * 1000, // 10 seconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {JsonDB} db
     */
    async execute(bot, interaction, db) {
        //@ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let data = db.getData('/')
            // @ts-ignore
            let gData = data[interaction.guild?.id]

            if (!gData) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`No data found for this guild`)
                            .setColor(0xff0000)
                    ]

                })
                return
            }

            let rawData = JSON.stringify(gData)
            let formattedData = JSON.stringify(gData, null, 4)

            let message = `
Raw:
\`\`\`${rawData}\`\`\`

Formatted:
\`\`\`${formattedData}\`\`\`
                        `

            if (message.length > 2000) {
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
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Data')
                            .setDescription(message)
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