const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')

let commands = []

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('The help command')
    ,
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     */
    async execute(bot, interaction) {
        let desc = `[Invite me](https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=18432&scope=bot%20applications.commands)
[Github repo](https://github.com/1Euro7Cent/Downtime-notifier)
Profile picture by [@JBugel#0001](https://github.com/Vibecord)
\n\n`
        let embed = new MessageEmbed()
            .setTitle('Help command')
            .setColor('#d4ff00')

        for (let command of commands) {
            desc += `**/${command.name}**: ${command.description}\n`
        }
        embed.setDescription(desc)
        await interaction.reply({
            embeds: [embed]
        })
    },
    /**
    * this runs on startup
    * @param {Client} bot
    */
    // @ts-ignore
    startup(bot) { commands = JSON.parse(fs.readFileSync('./commands.json')) }

}