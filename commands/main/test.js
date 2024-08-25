const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember, AutocompleteInteraction, Presence } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test the bot with a fake downtime.')
        /*.addUserOption(builder => {
            builder.setName('user')
                .setRequired(true)
                .setDescription('the user to test for')

            return builder
        })//*/
        .addStringOption(builder => {

            builder.setAutocomplete(true)
                .setDescription("The user to test for")
                .setName("user")
                .setRequired(true)

            return builder
        })
    ,
    cooldown: 60000, // milliseconds 1 minute
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
            let userID = interaction.options.getString('user')
            let user = await bot.users.fetch(userID).catch(e => null)
            if (!user) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`Failed to find user \`${userID}\``)
                            .setColor(0xff0000)

                    ]
                })
                return
            }

            let member = interaction.guild?.members.resolve(user.id)
            if (!member) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`Failed to find member \`${user.username}\``)
                            .setColor(0xff0000)

                    ]
                })
                return
            }
            // let db = new JsonDB(new Config("database", true, true, '/'))
            let data = db.getData('/')

            let currentPresence = member.presence
            // console.log(currentPresence)

            let goOffline = currentPresence.status == 'online'

            let currentPresence2 = structuredClone(currentPresence)

            currentPresence2.status = goOffline ? 'offline' : 'online'

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Testing')
                        .setDescription(`Simulating ${goOffline ? 'downtime' : 'uptime'} for \`${user.username}\` for 10 seconds`)
                        .setColor(0x00ff00)

                ]
            })
            // console.log(currentPresence)

            await bot.emit('presenceUpdate', currentPresence, currentPresence2)

            setTimeout(async () => {
                await bot.emit('presenceUpdate', currentPresence2, currentPresence)
            }, 10000) // wait 10 seconds

            // throw new Error('not implemented yet')
            return
            /**
             * @type {{broadcastChannel: string | null, users: {id:string,wentOffline:number,wentOnline:number}[]}}
             */
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: [],
                notifications: {}
            }
            if (gData.users.filter(u => u.id == user.id).length > 0) {
                await interaction.reply({
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
                await interaction.reply({
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
            // make shure the bot can send messages in the channel bevore adding it

            if (gData.broadcastChannel) {
                let channel = await bot.channels.fetch(gData.broadcastChannel).catch(e => null)



                if (channel && channel instanceof TextChannel && (!tools.hasPermissionToSendMessages(channel))) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Error')
                                .setDescription(`I don't have permission to send messages in ${channel} (${channel.id})\n\nMake shure I can see the channel and send messages in it`)
                                .setColor(0xff0000)

                        ]
                    })
                    return

                }
            }

            gData.users.push({ id: user.id })
            data[interaction.guild.id] = gData

            db.push('/', data)

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`\`${user.username}\` has been added to the watchlist.` + (gData.broadcastChannel !== null ? `` : '\n\nYou need to set a broadcast channel for the bot to send notifications to.'))
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