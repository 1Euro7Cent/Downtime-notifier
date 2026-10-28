const { Client, CommandInteraction, MessageEmbed, Permissions, GuildChannel, TextChannel, GuildMember, AutocompleteInteraction, Presence } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../../src/tools')

module.exports = {
    disabled: true,
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
        .addIntegerOption(builder => {
            builder.setName('duration')
                .setDescription('Duration of the fake downtime in seconds (default: 10)')
                .setMinValue(1)
                .setMaxValue(300) // 5 minutes
                .setRequired(false)
            return builder
        })
    ,
    cooldown: 60000, // milliseconds 1 minute
    // cooldown: 5000, // milliseconds 5 seconds
    /**
 * 
 * this is triggered when the user requests a aoutocompletion
 * @param {Client} bot
 * @param {AutocompleteInteraction} interaction
 * @param {import('node:sqlite').DatabaseSync} database
 * @param {(arg0: CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel, arg1: Error) => void} errorMessager
 */
    async autocomplete(bot, interaction, database, errorMessager) {
        /*
        await interaction.respond([
            {name:"This command is not yet implemented due", value: "a"},
            {name:"to important need for database change", value: "b"},
            {name:"dont worry this command will work soon", value: "c"}
        ])
        return// todo: implement test command

        //*/

        if (interaction.guild != null) {


            let watchingUsers = database.prepare("SELECT userId FROM users WHERE guildId = ? AND userId = ?").all(interaction.guild.id, interaction.user.id)

            

            let userIds = watchingUsers.map(u => u.userId)

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

            let duration = interaction.options.getInteger('duration') || 10


            await bot.users.fetch(user.id).catch(e => null)
            let member = interaction.guild?.members.resolve(user.id)
            if (!member) {
                member = await interaction.guild?.members.cache.get(user.id)
            }
            if (!member) {
                await interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Error')
                            .setDescription(`Failed to find member \`${user.username}\`\n If the user exists in the server, try to make it change its status in any way`)
                            .setColor(0xff0000)

                    ]
                })
                return
            }


            /** @type {Presence}*/
            // @ts-ignore
            let currentPresence = member.presence
            if (currentPresence == null) {
                console.error('presence is null. setting to empty object')
                // currentPresence = {
                //     guild: interaction.guild,
                //     userId: user.id,
                //     user: user,
                // }
                // @ts-ignore
                currentPresence = new Presence(bot, {
                    guild: interaction.guild,
                    userId: user.id,
                    user: user,
                })
                console.log(currentPresence)
            }
            // console.log(currentPresence)

            let goOffline = currentPresence.status == 'online'

            let currentPresence2 = structuredClone(currentPresence)

            currentPresence2.status = goOffline ? 'offline' : 'online'
            if (!currentPresence.guild) currentPresence.guild = interaction.guild
            if (!currentPresence2.guild) currentPresence2.guild = interaction.guild

            if (typeof currentPresence.guild.channels.fetch !== 'function') currentPresence.guild.channels.fetch = interaction.guild?.channels.fetch
            if (typeof currentPresence2.guild.channels.fetch !== 'function') currentPresence2.guild.channels.fetch = interaction.guild?.channels.fetch

            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Testing')
                        .setDescription(`Simulating ${goOffline ? 'downtime' : 'uptime'} for \`${user.username}\` for ${duration} seconds`)
                        .setColor(0x00ff00)

                ]
            })
            // console.log(currentPresence)

            await bot.emit('presenceUpdate', currentPresence, currentPresence2)

            setTimeout(async () => {
                await bot.emit('presenceUpdate', currentPresence2, currentPresence)
            }, duration * 1000) // wait for the specified duration

 
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