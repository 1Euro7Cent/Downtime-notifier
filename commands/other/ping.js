const { Client, CommandInteraction } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test the bot latency')
    ,
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     */
    execute(bot, interaction) {
        var start = Date.now()

        interaction.reply("wait a sec").then(() => {
            interaction.editReply("pong! " + (Date.now() - start) + "ms")
        })
    },
    /**
     * this runs on startup
     * @param {Client} bot
     */
    startup(bot) { },
    interval: 500,
    /**
     * this runs every interval milliseconds
     * @param {Client} bot
     */
    timed(bot) { }
}