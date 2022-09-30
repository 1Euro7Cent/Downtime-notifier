const { Client, CommandInteraction, MessageEmbed } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite the bot.')
    ,
    /**
     * @param {Client} bot
     * @param {CommandInteraction} interaction
     */
    async execute(bot, interaction) {
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Do you like the bot?')
                    .setDescription(`[Invite me](https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=18432&scope=bot%20applications.commands)\n[Support server](https://discord.gg/ht8bZeF)`)
                    .setColor('#0099ff')
            ]
        })
    },

}