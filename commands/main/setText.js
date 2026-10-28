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
        .setName('settext')
        .setDescription('change the text that the bot sends to the broadcast channel')
        .addStringOption(option => {
            option.setName('type')
                .setDescription('the type of text to change')
                .setRequired(true)
            option.addChoices({
                name: "Offline Title",
                value: "offlineTitle"
            })
            option.addChoices({
                name: "Offline Description",
                value: "offlineDescription"
            })


            option.addChoices({
                name: "Online Title",
                value: "onlineTitle"
            })
            option.addChoices({
                name: "Online Description",
                value: "onlineDescription"
            })


            return option
        })
        .addStringOption(option => {
            option.setName('text')
                .setDescription('The text to set. leave blank to reset. {tpye}=bot/user, {name}=name, {status}=online/offline')
                .setRequired(false)

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

        /*
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle("Not implemented")
                .setDescription("This command is not yet implemented due to important need for database change \ndont worry this command will work soon")
                .setColor(0xff0000)
            ],
            ephemeral: true
        })
        return
        //*/

        // @ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let type = interaction.options.getString('type')
            let text = interaction.options.getString('text')


            // let db = new JsonDB(new Config("database", true, true, '/'))

            let exists = database.prepare("SELECT guildId FROM texts WHERE guildId = ?").get(interaction.guild.id)

            if (!exists) {
                database.prepare("INSERT INTO texts (guildId) VALUES (?)").run(interaction.guild?.id)
            }


            // filter out the type



            let safeType = type.replace(/[^a-zA-Z]/g, '')
            if ((!text) || text == 'reset') {
                // delete gData.texts[type]
                database.prepare(`UPDATE texts SET ${safeType} = NULL WHERE guildId = ?`).run(interaction.guild?.id)
            }
            else {
                // gData.texts[type] = text
                database.prepare(`UPDATE texts SET ${safeType} = ? WHERE guildId = ?`).run(text, interaction.guild?.id)
            }

            // db.push('/', data)

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`Text for \`${type}\` has been set to ${!text ? 'default' : ` \`\`\`\n${text}\n\`\`\` `}`)
                        .setColor(0x00ff00)
                ]
            })


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