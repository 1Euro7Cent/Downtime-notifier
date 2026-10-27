const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../src/tools')

module.exports = {
    disabled: false,
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Adds a bot to the watchlist.')
        .addUserOption(builder => {
            builder.setName('user')
                .setRequired(true)
                .setDescription('the user to add')

            return builder
        })
        .addIntegerOption(builder => {
            builder.setName('duration')
                .setDescription('Duration of downtime in seconds for actually notifying (default: 0)')
                .setMinValue(0)
                .setMaxValue(300) // 5 minutes
                .setRequired(false)
            return builder
        })
    ,
    cooldown: null, // milliseconds
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     * @param {import('node:sqlite').DatabaseSync} database
     */
    async execute(bot, interaction, database) {
        //@ts-ignore
        if (interaction.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) {
            let user = interaction.options.getUser('user')
            let duration = interaction.options.getInteger('duration') || 0
            // let db = new JsonDB(new Config("database", true, true, '/'))

            /*
            let data = db.getData('/')

            /**
             * @type {{broadcastChannel: string | null, users: {id:string,wentOffline:number,wentOnline:number}[]}}
             */
            /*
            let gData = data[interaction.guild.id]
            if (!gData) gData = {
                broadcastChannel: null,
                users: [],
                notifications: {}
            }

            //*/

            // check if the user is already in the watchlist

            let userInWatchlist = database.prepare("SELECT * FROM users WHERE guildId = ? AND userId = ?").get(interaction.guild.id, user.id)


            if (typeof userInWatchlist !== "undefined") {
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

            let broadcastChannel = database.prepare('SELECT broadcastChannelId FROM guilds WHERE guildId = ?').get(interaction.guild.id)?.broadcastChannelId

            if (broadcastChannel) {
                let channel = await bot.channels.fetch(broadcastChannel).catch(e => null)



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

            database.prepare("INSERT INTO users (guildId, userId, downThreshold) VALUES (?, ?, ?)").run(interaction.guild.id, user.id, duration)

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`Success`)
                        .setDescription(`\`${user.username}\` has been added to the watchlist.` + (broadcastChannel !== null ? `` : '\n\nYou need to set a broadcast channel for the bot to send notifications to.'))
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