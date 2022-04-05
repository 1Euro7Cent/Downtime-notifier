const { Client, CommandInteraction, MessageEmbed, Permissions } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('adds a bot to the watchlist')
        .addUserOption(builder => {
            builder.setName('user')
                .setRequired(true)
                .setDescription('the user to add')

            return builder
        })
    ,
    cooldown: null, // milliseconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {JsonDB} db
     */
    async execute(bot, interaction, db) {
        //@ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let user = interaction.options.getUser('user')
            // let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: []
            }
            if (gData.users.filter(u => u.id == user.id).length > 0) {
                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`User \`${user.username}\` is already in the watchlist`)
                            .setColor(0xff0000)

                    ]
                })
                return
            }
            process.stdout.write(`fetching user ${user.id}... `)
            let fetched = await bot.users.fetch(user.id).catch(e => null)
            if (!fetched) {
                console.log('ERROR')
                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`Failed to find user \`${user.username}\``)
                            .setColor(0xff0000)

                    ]
                })
                return
            }
            console.log(`Done`)
            // console.log(fetched)

            gData.users.push({ id: user.id })
            data[interaction.guild.id] = gData

            db.push('/', data)

            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`\`${user.username}\` has been added to the watchlist.` + (gData.broadcastChannel !== null ? `` : '\n\nYou need to set a broadcast channel for the bot to send notifications to.'))
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