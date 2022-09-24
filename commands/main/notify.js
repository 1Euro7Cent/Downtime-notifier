const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember, AutocompleteInteraction, User } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('notify')
        .setDescription('Whether to notify you when a bot is going offline / online')
        .addStringOption(builder => {
            return builder.setName('state')
                .setDescription('Whether to add or remove the user from the notify list')
                .setRequired(true)
                .addChoices(
                    {
                        name: 'enable',
                        value: 'enable'
                    },
                    {
                        name: 'disable',
                        value: 'disable'
                    })
        })
        .addStringOption(builder => {

            builder.setAutocomplete(true)
                .setDescription("The user to notify you about going offline / online")
                .setName("user")
                .setRequired(true)

            return builder
        })

    ,
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

            let removableUsers = users.filter(u => {
                if (gData.notifications[interaction.user.id]) {
                    return gData.notifications[interaction.user.id].includes(u.id)
                }
                return false
            })
            // console.log(removableUsers)

            let possibleValues = users.filter(u => u != null && (u.username.toLowerCase().includes(focusedValue.toLowerCase())
                || u.tag.toLowerCase().includes(focusedValue.toLowerCase())
                || u.id.toLowerCase().includes(focusedValue.toLowerCase())
            ))

            let respondData = possibleValues.map(choice => ({ name: choice.tag + (removableUsers.includes(choice) ? ' (Removeable)' : ''), value: choice.id }))

            if (respondData.length > 0) {
                respondData.unshift({ name: 'All', value: 'all' })
            }

            await interaction.respond(respondData)
        }

    },


    /**
     * this runs when the command is executed
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {JsonDB} db
     * @param {(arg0: CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel, arg1: Error) => void} errorMessager
     */
    async execute(bot, interaction, db, errorMessager) {
        // @ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let data = db.getData('/')
            let gData = data[interaction.guild.id]

            if (!gData) {
                gData = {
                    broadcastChannel: null,
                    users: [],
                    notifications: {}
                }
            }

            let state = interaction.options.getString('state')
            let user = interaction.options.getString('user')

            let userNotifications = gData.notifications[interaction.user.id]

            switch (state) {
                case 'enable':
                    if (user == 'all') {
                        gData.notifications[interaction.user.id] = ['all']
                    }
                    else {
                        if (!userNotifications) {
                            userNotifications = []
                        }

                        if (userNotifications.includes('all')) {
                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('Error')
                                        .setDescription('You are already being notified about all users')
                                        .setColor(0xff0000)

                                ]
                            })
                            return
                        }
                        else {

                            if (userNotifications.includes(user)) {
                                await interaction.reply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setTitle('Error')
                                            .setDescription('You are already being notified about this user')
                                            .setColor(0xff0000)

                                    ]
                                })
                                return
                            }
                            else {

                                userNotifications.push(user)
                            }
                            gData.notifications[interaction.user.id] = userNotifications
                        }
                    }

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Success')
                                .setDescription(`You will now be notified when ${user == 'all' ? '\`anyone in the list\`' : `<@${user}>`} goes offline / online`)
                                .setColor(0x00ff00)
                        ]
                    })
                    break

                case 'disable':
                    if (user == 'all') {
                        delete gData.notifications[interaction.user.id]

                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setTitle('Success')
                                    .setDescription(`You will no longer be notified when anyone goes offline / online`)
                                    .setColor(0x00ff00)
                            ]
                        })
                    }
                    else {
                        if (!userNotifications) {
                            userNotifications = []
                        }

                        if (userNotifications.includes('all')) {
                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('Error')
                                        .setDescription('You are already being notified about all users. remove all and then add specific users')
                                        .setColor(0xff0000)

                                ]
                            })
                        }
                        else {
                            if (userNotifications.includes(user)) {
                                userNotifications.splice(userNotifications.indexOf(user), 1)
                                gData.notifications[interaction.user.id] = userNotifications
                            }
                            else {
                                await interaction.reply({
                                    embeds: [
                                        new MessageEmbed()
                                            .setTitle('Error')
                                            .setDescription('That user is not in your notification list')
                                            .setColor(0xff0000)

                                    ]
                                })
                                return
                            }

                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('Success')
                                        .setDescription(`You will no longer be notified when <@${user}> goes offline / online`)
                                        .setColor(0x00ff00)
                                ]
                            })
                        }

                    }


                    break
            }

            db.push('/', data)




        } else {
            await interaction.reply('You do not have permission to do that')
        }


    },
}