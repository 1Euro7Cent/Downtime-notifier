const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')

let commands = []

let data = {
    botVersion: "-0.0.0 failed to load"
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('The help command.')
    ,
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     */
    async execute(bot, interaction) {
        let desc = `[Invite me](https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=18432&scope=bot%20applications.commands)
Profile picture by [JBugel#0001](https://github.com/Vibecord)
        
Having issues or questions? Reach out to me on
[Github repo / issue](https://github.com/1Euro7Cent/Downtime-notifier)
[Discord support server](https://discord.gg/ht8bZeF)
discord dm (mrballou#9055)
[Reddit dm](https://www.reddit.com/user/1Euro7Cent)

Bot version: \`${data.botVersion}\`
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
    startup(bot) {
        commands = JSON.parse(fs.readFileSync('./commands.json', 'utf8'))

        let package = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
        data.botVersion = package.version
    }

}