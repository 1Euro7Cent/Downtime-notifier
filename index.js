const fs = require('fs')
const { Client, Intents, MessageEmbed, CommandInteraction, GuildChannel, AutocompleteInteraction } = require('discord.js')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const startup = require("startup-args")
const args = new startup.StartupArgs("-")
const process = require('process')
const Cooldown = require('node-cooldown')
const prettyMs = require('pretty-ms')
const tools = require('./tools')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')

// make shure all important dirs nad config exist
if (!fs.existsSync('./config.json')) fs.writeFileSync('./config.json', JSON.stringify({ token: 'get your token at https://discord.com/developers/applications', "logs": { crash: "crash{y}.{m}.{d}-{h}_{i}.{s}.log" }, }, null, 2))
if (!fs.existsSync('./logs')) fs.mkdirSync('./logs')
if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')

// wipe temp folder at startup to make shure no old files are left
fs.readdirSync('./temp').forEach(file => {
    fs.unlinkSync(`./temp/${file}`)
})

let db = new JsonDB(new Config("database", true, args.get("dev"), '/'))

const config = require('./config.json')

let ready = false


if (process.platform === "win32") {
    let rl = require("readline").createInterface({
        input: process.stdin
    })

    rl.on("SIGINT", function () {
        process.emit("SIGINT")
    })
}

process.on("SIGINT", function () {
    process.exit(-1)
})

process.on('exit', function (code) {
    console.log(`Process exited with code: ${code}`)

    if (code != 0) {
        if (!fs.existsSync('./dbBackups')) fs.mkdirSync('./dbBackups')
        fs.writeFileSync(`./dbBackups/db${Date.now()}.json`, JSON.stringify(db.getData('/')))

        let dircontent = fs.readdirSync('./dbBackups')
        if (dircontent.length > 10) {
            // delete the oldest file
            let oldest = dircontent[0]
            fs.unlinkSync(`./dbBackups/${oldest}`)
        }
    }
    else {
        db.save()
    }
})

process.on('uncaughtException', err => {
    let date = new Date()
    let year = date.getFullYear().toString()
    let month = (date.getMonth() + 1).toString()
    let day = date.getDate().toString()
    let hour = date.getHours().toString()
    let minute = date.getMinutes().toString()
    let seconds = date.getSeconds().toString()


    let filename = './logs/' + (config.logs?.crash.replace('{y}', year).replace('{m}', month).replace('{d}', day).replace('{h}', hour).replace('{i}', minute).replace('{s}', seconds) || 'latestCrash.log')
    fs.writeFileSync(filename, err.stack)
    console.error(err)
    console.log(`log written to ${filename}`)
    process.exit(1)
})




// const bot = new Client({ intents: new Intents(32767) }) // make shure we have every intent
const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_PRESENCES,
    ]
})

var cooldowns = {}
var commands = []

function loadCommands(path) {
    var files = fs.readdirSync(path)
    var cmds = []
    for (let file of files) {
        var filePath = path + '/' + file
        var stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
            var cmd = loadCommands(filePath)
            for (let c of cmd) {
                cmds.push(c)
            }
        } else {
            if (file.endsWith('.js')) {
                var command = require(filePath)
                // bot.commands.set(command.name, command)
                if (!command.disabled || !command.noCommand) {
                    command['fName'] = file.replace('.js', '')
                    cmds.push(command)
                    if (command.cooldown) {
                        cooldowns[command.data.name] = new Cooldown(command.cooldown)
                    }
                }
                else {
                    console.log(`skipping ${filePath} reason: disabled`)
                }


                if (!command.data && !command.noCommand) {
                    // commands.push(command.data)
                    console.log(`skipping ${filePath} reason: SlashCommandBuilder is missing`)
                    continue
                }
            }
            else {
                console.log('skipping ' + filePath, 'reason: not a js file')
            }
        }
    }
    return cmds
}

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`)



    commands = loadCommands('./commands')
    console.log(cooldowns)
    // console.log(commands)
    process.stdout.write(`loaded ${commands.length} commands.\n`)
    //*

    // copy commands to new var
    var cmdToDc = []
    for (let cmd of commands) {

        if (!cmd.data) {
            console.log(`${cmd.fName} is not a command`)
            continue
        }

        cmdToDc.push(cmd['data'])
    }

    const rest = new REST({ version: '9' }).setToken(config.token);


    // console.log(cmdToDc, 'sending this to dc');


    (async () => {
        try {
            if (tools.objLength(db.getData('/')) >= 20) {
                console.log('setting status to notify that the bot is starting up')

                bot.user?.setPresence({
                    activities: [{
                        name: "Starting up...",
                        type: "PLAYING"
                    }]
                })
                bot.user?.setStatus('dnd')
            }
            if (args.get('reload')) {
                var arg = args.get('reload')
                // console.log(arg)
                if (Array.isArray(arg)) {


                    for (let guildID of arg) {
                        process.stdout.write(`reloading ${guildID}'s slash commands... `)
                        await rest.put(Routes.applicationGuildCommands(bot.user.id, guildID), { body: [] })
                        console.log('done.')
                    }
                }
            }
            if (args.get('del')) {
                process.stdout.write('clearing old commands... ')
                await rest.put(Routes.applicationCommands(bot.user.id), { body: [] })
                console.log('done. exiting')
                process.exit(0)
            }
            // console.log('Started refreshing application slash commands.');
            /*
                        await rest.put(
                            Routes.applicationCommands(bot.user.id),
                            { body: commands },
                        );//*/
            // console.log(cmdToDc)
            if (!fs.existsSync('./commands.json')) fs.writeFileSync('./commands.json', '{}')
            /**
             * @type {Object}
             */
            var oldCommands = fs.readFileSync('./commands.json')
            // @ts-ignore
            oldCommands = JSON.stringify(JSON.parse(oldCommands))
            if (JSON.stringify(cmdToDc) != oldCommands) {
                process.stdout.write(`refreshing slash commands... `)

                // var applications = await bot.get
                await rest.put(Routes.applicationCommands(bot.user.id), { body: cmdToDc })

                console.log('DONE')


                console.log('Successfully reloaded application slash commands.')

            }
            else {
                console.log('no changes. skipping upload to discord')
            }
            fs.writeFileSync('./commands.json', JSON.stringify(cmdToDc, null, 2))




            try {
                for (let cmd of commands) {
                    if (cmd.startup) {
                        await cmd.startup(bot, db, errorMessager)
                    }
                    else {
                        console.log(`skipping ${cmd?.data?.name ?? cmd?.fName} startup`)
                    }
                    if (cmd.interval) {
                        if (cmd.timed) {
                            setInterval(async () => {
                                await cmd.timed(bot, db, errorMessager)
                            }, cmd.interval)
                        }
                        else {
                            console.log(`skipping ${cmd?.data?.name ?? cmd?.fName} interval because of no timed function`)
                        }
                    }
                    else {
                        console.log(`skipping ${cmd?.data?.name ?? cmd?.fName} interval`)
                    }
                }
            } catch (e) {
                errorMessager(undefined, e)
            }

            // await tools.sleep(10000)
            console.log(`Bot ${bot.user.tag} is ready!`)
            ready = true
            bot.user?.setStatus('online')
            bot.user?.setPresence({
                activities: [{
                    name: "Running",
                    type: "PLAYING"
                }]
            })

        } catch (error) {
            console.error(error)
            console.log('Failed to refresh application slash commands.')
            process.exit(1)
        }
    })() //*/

    // set bot status
    // bot.user.setActivity('Now with slash commands')
    setInterval(() => {

        if (!ready) return

        let statusses = config.statuses
        if (statusses && statusses.length == 0) return
        let status = statusses[Math.floor(Math.random() * statusses.length)]
        let stats = tools.getStatsFromDB(db.getData("/"))

        stats.avgDowntime = Math.round(stats.avgDowntime)
        stats.avgUptime = Math.round(stats.avgUptime)

        let downPow = 1
        let upPow = 1

        if (stats.avgDowntime >= Math.pow(10, 6)) downPow = 6

        if (stats.avgUptime >= Math.pow(10, 6)) upPow = 6

        // console.log(stats)
        // replace all variables
        status = status.replace('{guilds}', bot.guilds.cache.size)
            .replace('{manageGuilds}', stats.managingGuilds)
            .replace('{manageUsers}', stats.managingUsers)
            .replace('{avgDowntimePRETTY}', prettyMs(tools.roundToNearest(stats.avgDowntime, downPow)))
            .replace('{avgDowntime}', stats.avgDowntime)
            .replace('{avgUptimePRETTY}', prettyMs(tools.roundToNearest(stats.avgUptime, upPow)))
            .replace('{avgUptime}', stats.avgUptime)


        bot.user.setActivity(status)
        console.log(`setting status to ${status}`)


    }, 2 * 60 * 1000) // every 2 minutes 
})
bot.on('interactionCreate', async interaction => {
    // console.log('interaction', interaction)

    if (interaction.isAutocomplete()) {
        try {
            if (!commands || !ready) {
                await interaction.respond([{
                    name: 'I am not ready yet, please try again later',
                    value: 'e.notReady'
                }])
                return
            }
            for (let cmd of commands) {
                if (cmd?.data?.name == interaction.commandName) {
                    console.log('autocomplete for', interaction.commandName)
                    if (cmd.autocomplete) {
                        await cmd.autocomplete(bot, interaction, db, errorMessager)
                    }
                    else {
                        console.log(`no autocomplete for ${cmd.data.name}`)
                    }
                }
            }
        }
        catch (e) {
            errorMessager(interaction, e)
        }

    }
    else {


        if (!interaction.isCommand()) return
        // console.log('after isCommand')
        try {
            if (!commands || !ready) {
                await interaction.reply('I am not ready yet, please try again later')
                return
            }
            // console.log('all commands', commands)
            for (let cmd of commands) {
                if (cmd?.data?.name == interaction.commandName) {
                    // @ts-ignore
                    console.log(`a new command ${cmd.data.name} was called by ${interaction.user?.tag} in guild ${interaction.guild?.name} in channel ${interaction.channel?.name} `)
                    // get all args
                    //@ts-ignore
                    var args = interaction.options._hoistedOptions
                    for (let arg in args) {
                        console.log(`${args[arg].name}: ${args[arg].value}`)
                    }
                    // console.log('command OUTPUT:')
                    let cd = cooldowns[interaction.commandName]
                    let rateLimitData
                    if (cd) {
                        rateLimitData = cd.check(interaction.user.id)
                        if (rateLimitData.pass) {
                            // cooldown passed
                            await cmd.execute(bot, interaction, db, errorMessager)
                        }
                        else {
                            // blocked by cooldown
                            await interaction.reply({
                                embeds: [
                                    new MessageEmbed()
                                        .setTitle('RateLimit hit')
                                        .setDescription(`Wait wait wait. you are doing stuff too fast. Please wait another \`${prettyMs(rateLimitData.restTime, { verbose: true })}\` until you can use this command again.`)
                                        .setColor(0xFF0000)
                                ]
                            })
                        }
                    }
                    else {
                        await cmd.execute(bot, interaction, db, errorMessager)
                    }
                    // console.log('END command OUTPUT')
                }
            }
        }
        catch (e) {
            errorMessager(interaction, e)
        }
    }
})
bot.on('rateLimit', (data) => {
    console.log('##########rateLimit##########')
    console.log(data)
    console.log('##########rateLimit##########')
})
bot.on('messageCreate', message => {
    {
        if (message.author.bot) return
        var mentions = message.mentions.users.toJSON()
        if (mentions[0]?.id == bot.user.id) {
            message.channel.send(`Hello ${message.author.username}! i do no longer support chat commands. please use slash commands instead. if you cannot see any slash commands, please reinvite the bot.`)
        }
    }
})


/**
 * @param {CommandInteraction | null | undefined | import('discord.js').GuildTextBasedChannel | AutocompleteInteraction} interaction
 * @param {Error} e
 * @returns {boolean} true if the error can be ignored
 */
function errorMessager(interaction, e) {
    if (e.name == 'AbortError') return true
    console.error(e)
    if (interaction instanceof CommandInteraction) {
        interaction.reply(getErrMes(e)).catch(err => {
            console.error(err)
            interaction.editReply(getErrMes(e)).catch((e) => {
                console.error(e)
                interaction.channel?.send(getErrMes(e)).catch(err => {
                    console.error(err)
                })
            })
        })
    }
    else {
        if (interaction instanceof AutocompleteInteraction) {
            interaction.respond([{
                name: 'An error occured:',
                value: 'e.message'

            },
            {
                name: 'Error message:',
                value: "e.message"
            },
            {
                name: e.message.length > 100 ? e.message.substring(0, 100) : e.message,
                value: "e.message"
            },
            {
                name: 'Error stack:',
                value: "e.stack"
            },
            {
                name: e.stack && e.stack.length > 100 ? e.stack.substring(0, 100) : e.stack ?? 'no stack pt1',
                value: "e.stack"
            },
            {
                name: e.stack && e.stack.length - 100 > 100 ? e.stack.substring(100, 200) : e.stack ?? 'no stack pt2',
                value: "e.name"
            }
            ])
            return
        }

        if (typeof interaction?.send == 'function') {

            interaction.send(getErrMes(e)).catch(err => {
                console.error(err)
            })
        }
    }

    return false

}

/**
 * @param {Error} e
 */
function getErrMes(e) {
    return {
        embeds: [
            new MessageEmbed()
                .setTitle(e.name)
                .setColor('#ff0000')
                .setDescription(`An error occured while running the command.

\`${e.message}\`

\`${e.stack}\`

please report this to the developer (/invite)`)
        ]
    }
}


bot.login(config.token)