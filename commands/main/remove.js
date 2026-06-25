const { Client, CommandInteraction, MessageEmbed, Permissions, AutocompleteInteraction, User } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a bot from the watchlist.')
        .addStringOption(builder => {
            builder.setName('user')
                .setRequired(true)
                .setDescription('the user to remove')
                .setAutocomplete(true)

            return builder
        })
    ,
    cooldown: null, // milliseconds

    /**
 * 
 * this is triggered when the user requests a aoutocompletion
 * @param {Client} bot
 * @param {AutocompleteInteraction} interaction
 * @param {JsonDB} db
 * @param {(arg0: CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel, arg1: Error) => void} errorMessager
 */
    async autocomplete(bot, interaction, db, errorMessager) {

        if (interaction.guild != null) {

            let data = db.getData('/')
            let gData = data[interaction.guild.id]

            if (!gData) {
                gData = {
                    broadcastChannel: null,
                    users: [],
                    notifications: []
                }
            }
            if (!gData.notifications) gData.notifications = {}

            let userIds = gData.users.map(u => u.id)

            /**
             * @type {User[]}
             */
            let users = await Promise.all(userIds.map(async id => {
                let user = await bot.users.fetch(id).catch(e => null)
                return user
            }))

            let focusedValue = interaction.options.getFocused()

            // console.log(removableUsers)

            let possibleValues = users.filter(u => u != null && (u.username.toLowerCase().includes(focusedValue.toLowerCase())
                || u.tag.toLowerCase().includes(focusedValue.toLowerCase())
                || u.id.toLowerCase().includes(focusedValue.toLowerCase())
            ))

            let respondData = possibleValues.map(choice => ({ name: choice.tag, value: choice.id }))

            // if (respondData.length > 0) {
            //     if (gData.notifications[interaction.user.id] && gData.notifications[interaction.user.id].includes('all'))
            //         respondData.unshift({ name: 'All (Removeable)', value: 'all' })
            //     else
            //         respondData.unshift({ name: 'All', value: 'all' })
            // }
            // console.log(respondData)

            await interaction.respond(respondData)
        }

    },
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {JsonDB} db
     */
    async execute(bot, interaction, db) {
        //@ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            // let user = interaction.options.getUser('user')
            /**
             * @type {User}
             */
            let user = interaction.options.getString('user')
            user = await bot.users.fetch(user).catch(e => null)
            // let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: []
            }
            let users = gData.users.filter(u => u.id == user.id)
            if (users.length == 0) {

                await interaction.reply({
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

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`\`${user.username}\` has been removed from the watchlist.`)
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