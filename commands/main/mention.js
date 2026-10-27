const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember, AutocompleteInteraction, User } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../src/tools')
const { type } = require('os')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('mention')
        .setDescription('Whether to mention you when a bot is going offline / online.')
        .addStringOption(builder => {
            return builder.setName('state')
                .setDescription('Whether to add or remove the user from the mention list')
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
                .setDescription("The user to mention you about going offline / online")
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
     * @param {import('node:sqlite').DatabaseSync} database
     * @param {(arg0: CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel, arg1: Error) => void} errorMessager
     */
    async autocomplete(bot, interaction, database, errorMessager) {

        if (interaction.guild != null) {

            let userIds = database.prepare("SELECT userId FROM users WHERE guildId = ?").all(interaction.guild.id)
            // console.log("userIds", userIds)

            // let data = db.getData('/')
            // let gData = data[interaction.guild.id]

            // if (!gData) {
            //     gData = {
            //         broadcastChannel: null,
            //         users: [],
            //         notifications: []
            //     }
            // }
            // if (!gData.notifications) gData.notifications = {}

            // let userIds = gData.users.map(u => u.id)

            /**
             * @type {User[]}
             */
            let users = await Promise.all(userIds.map(async id => {
                let user = await bot.users.fetch(id.userId).catch(e => null)
                return user
            }))
            // console.log("users", users)

            let focusedValue = interaction.options.getFocused()

            let watchingUsers = database.prepare("SELECT watchId FROM notifications WHERE guildId = ? AND mentionUserId = ?").all(interaction.guild.id, interaction.user.id)
            // console.log("watchingUsers", watchingUsers)

            let removableUsers = users.filter(u => {
                if (u == null || u.id == null) return false;
                return watchingUsers.some(w => w.watchId === u.id);
                // return watchingUsers.includes(u.userId)
            });
            // console.log("removeableUsers", removableUsers)

            let possibleValues = users.filter(u => u != null && (u.username.toLowerCase().includes(focusedValue.toLowerCase())
                || u.tag.toLowerCase().includes(focusedValue.toLowerCase())
                || u.id.toLowerCase().includes(focusedValue.toLowerCase())
            ))

            let respondData = possibleValues.map(choice => ({ name: choice.username + (removableUsers.includes(choice) ? ' (Removeable)' : ''), value: choice.id }))


            respondData.unshift({ name: 'All', value: 'all' })


            await interaction.respond(respondData)
        }

    },


    /**
     * this runs when the command is executed
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {import('node:sqlite').DatabaseSync} database
     * @param {(arg0: CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel, arg1: Error) => void} errorMessager
     */
    async execute(bot, interaction, database, errorMessager) {
        // @ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {



            let state = interaction.options.getString('state')
            let user = interaction.options.getString('user')

            // let userNotifications = gData.notifications[interaction.user.id]


            switch (state) {
                case 'enable':
                    if (user == 'all') {
                        // gData.notifications[interaction.user.id] = ['all']

                        // get all available users and add all of them


                        let validUsersToAdd = database.prepare(`INSERT INTO notifications (guildId, mentionUserId, watchId)
                            SELECT u.guildId, ?, u.userid
                            FROM users u
                            WHERE u.guildId = ?
                            AND NOT EXISTS (
                                SELECT 1 
                                FROM notifications n 
                                WHERE n.guildId = u.guildId 
                                    AND n.watchId = u.userid
                            );`).all(interaction.user.id, interaction.guild.id)


                    }
                    else {

                        let exists = database.prepare("SELECT * FROM notifications WHERE guildId = ? AND mentionUserId = ? AND watchId = ?").get(interaction.guild?.id, interaction.user.id, user)

                        if (exists) {
                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('Error')
                                        .setDescription('You are already being mentioned about this user')
                                        .setColor(0xff0000)

                                ]
                            })
                            return
                        }
                        else {

                            // userNotifications.push(user)

                            database.prepare("INSERT INTO notifications (guildId, mentionUserId, watchId) VALUES (?, ?, ?)").run(interaction.guild?.id, interaction.user.id, user)
                        }
                        // gData.notifications[interaction.user.id] = userNotifications

                    }

                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Success')
                                .setDescription(`You will now be mentioned when ${user == 'all' ? '\`anyone in the list\`' : `<@${user}>`} goes offline / online`)
                                .setColor(0x00ff00)
                        ]
                    })
                    break

                case 'disable':
                    if (user == 'all') {

                        database.prepare("DELETE FROM notifications WHERE guildId = ? AND mentionUserId = ?").run(interaction.guild?.id, interaction.user.id)

                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setTitle('Success')
                                    .setDescription(`You will no longer be mentioned when anyone goes offline / online`)
                                    .setColor(0x00ff00)
                            ]
                        })
                    }
                    else {

                        let exists = database.prepare("SELECT * FROM notifications WHERE guildId = ? AND mentionUserId = ? AND watchId = ?").get(interaction.guild?.id, interaction.user.id, user)

                        if (exists) {
                            
                            database.prepare("DELETE FROM notifications WHERE guildId = ? AND mentionUserId = ? AND watchId = ?").run(interaction.guild?.id, interaction.user.id, user)
                        }
                        else {
                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('Error')
                                        .setDescription('That user is not in your mention list')
                                        .setColor(0xff0000)

                                ]
                            })
                            return
                        }

                        await interaction.reply({
                            embeds: [
                                new MessageEmbed()
                                    .setTitle('Success')
                                    .setDescription(`You will no longer be mentioned when <@${user}> goes offline / online`)
                                    .setColor(0x00ff00)
                            ]
                        })


                    }


                    break
            }

        } else {
            await interaction.reply('You do not have permission to do that')
        }


    },
}