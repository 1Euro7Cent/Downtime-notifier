const { Client, CommandInteraction, MessageEmbed, Permissions, TextChannel } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// database stuff
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const { ChannelType } = require('discord-api-types/v10')

const tools = require('../../tools')


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
                .setDescription('The text to set. Type "reset" to reset. {tpye}=bot/user, {name}=name, {status}=online/offline')
                .setRequired(true)

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
     * @param {JsonDB} db
     */
    async execute(bot, interaction, db) {
        // @ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let type = interaction.options.getString('type')
            let text = interaction.options.getString('text')


            // let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: [],
                notifications: {},
                texts: {}
            }


            // filter out the type

            if (!gData.texts) {
                gData.texts = {}
            }


            if (text == 'reset') {
                delete gData.texts[type]
            }
            else {
                gData.texts[type] = text
            }

            db.push('/', data)

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`Text for \`${type}\` has been set to ${text == 'reset' ? 'default' : ` \`\`\`\n${text}\n\`\`\` `}`)
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