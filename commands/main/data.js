const { Client, CommandInteraction, MessageEmbed, Permissions, MessageActionRow, MessageButton, Interaction, Message } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')
const fs = require('fs')
const prettyMs = require('pretty-ms')


let deleteRequests = {}

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('data')
        .setDescription('Manage the data stored in the bot.')
        .addStringOption((builder) => {
            builder.setName("option")
            builder.setDescription("What the bot should do")
            builder.addChoices({
                name: "get", value: "get"
            })
            builder.addChoices({
                name: "delete", value: "delete"
            })
            builder.setRequired(true)
            return builder
        })
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
            let option = interaction.options.getString("option")
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
            switch (option) {
                case 'get':
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
                    break
                case 'delete':
                    // send warning message where the user has to confirm with button

                    let row = new MessageActionRow()

                    row.addComponents(
                        new MessageButton()
                            .setCustomId("yes")
                            .setLabel("YES")
                            .setStyle("DANGER"),

                        new MessageButton()
                            .setCustomId("no")
                            .setLabel("NO")
                            .setStyle("SUCCESS")

                    )

                    let confirmMessage = await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle("Warning")
                                .setDescription(`This operation is irreversible. Do you want to continue?`)
                                .addFields({
                                    name: "Time left",
                                    value: prettyMs(1 * 60 * 1000)
                                })
                                .setColor(0xff0000)
                        ],
                        components: [row],
                        fetchReply: true
                    })

                    deleteRequests[interaction.user.id] = {
                        restTime: 1 * 60 * 1000, // 1 minute
                        message: confirmMessage
                    }



                    break
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
    /**
     * this runs on startup
     * @param {Client} bot
     * @param {JsonDB} db
     * @param {(arg0: Interaction | import('discord.js').AnyChannel, arg1: Error) => void} errorMessager
     */
    async startup(bot, db, errorMessager) {
        bot.on("interactionCreate", async (interaction) => {
            if (!interaction.isButton()) return
            try {

                let hasPerms = false
                for (let deleteRequest in deleteRequests) {
                    if (deleteRequest == interaction.user.id) {
                        // the user has permission on that specific deletion
                        hasPerms = true
                        switch (interaction.customId) {
                            case 'yes':
                                let data = db.getData('/')

                                if (interaction.guild?.id) delete data[interaction.guild?.id]
                                db.push("/", data)

                                await interaction.reply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setTitle("Success")
                                            .setColor("#ffff00")
                                            .setDescription("Your data has successfully being deleted")
                                    ]
                                })


                                break
                            case 'no':
                                await interaction.reply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setTitle("Canceled")
                                            .setColor("#00ff00")
                                            .setDescription("Your request for data deletion was canceled")
                                    ]
                                })
                                break
                        }

                        delete deleteRequests[deleteRequest]

                        return
                    }

                }

                if (!hasPerms) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle("ERROR")
                                .setDescription("You dont have permissions to do that")
                                .setColor("#ff0000")
                        ],
                        ephemeral: true
                    })
                }
            }
            catch (e) {
                errorMessager(interaction, e)
            }
        })

    },
    interval: 5 * 1000, // 5 seconds
    /**
     * this runs every interval milliseconds
     * @param {Client} bot
     * @param {(arg0: Interaction | import('discord.js').AnyChannel, arg1: Error) => void} errorMessager
     * @param {JsonDB} db
     */
    async timed(bot, db, errorMessager) {

        for (let deleteRequest in deleteRequests) {
            let request = deleteRequests[deleteRequest]

            request.restTime -= 5 * 1000 // 5 seconds

            request.message.embeds[0].fields[0].value = request.restTime <= 0 ? "Time ran out" : prettyMs(request.restTime)
            /**
             * @type {Message}
             */
            let message = request.message
            await message.edit({
                embeds: message.embeds,
                components: message.components
            }).catch(err => {
                errorMessager(message, err)
            })

            if (request.restTime <= 0) delete deleteRequests[deleteRequest]
        }
    }
}