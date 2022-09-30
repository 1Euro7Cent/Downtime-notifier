const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../tools')

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