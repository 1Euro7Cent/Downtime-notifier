const { Client, MessageEmbed } = require('discord.js');
const bot = new Client;
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const prettyMilliseconds = require('pretty-ms');

var db = new JsonDB(new Config("database", true, true, '/'));

const config = require('./config.json')
const prefix = config.prefix;

function msToReadabletime(ms) {
  var type
  var sec
  var min
  if (ms > 1000) {
    sec = ms / 1000
    type = 'seconds'
  } else {
    type = 'ms'
  }
  if (sec > 60) {
    type = 'minutes'
    min = sec / 60
  }

}
bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async (message, guild) => {
  if (message.author.bot) return;


  if (message.content.startsWith(prefix)) {
    var [CMD_NAME, ...args] = message.content
      .toLowerCase()
      .trim()
      .substring(prefix.length)
      .split(/\s/);

    switch (CMD_NAME) {
      case 'list':
        var data = db.getData(`/guild/${message.guild.id}/bots`);
        var desc = ''
        for (let i in data) {
          desc = desc + `<@!${i}> (${i}) \n`
        }
        message.channel.send(new MessageEmbed()
          .setTitle('A list of all bots')
          .setDescription(desc)
          .setColor(0x00ff00)
        )

        break;
      case 'channel':
        if (message.member.hasPermission('MANAGE_GUILD')) {
          var ChannelID = message.content.replace(/\D/g, '');
          if (ChannelID > 100) {

            var data = db.getData("/");
            if (typeof data.guild[message.guild.id] === 'undefined') {
              data.guild[message.guild.id] = {}
            }
            data.guild[message.guild.id].brodcastChannel = ChannelID
            if (typeof data.guild[message.guild.id].bots === 'undefined') {
              data.guild[message.guild.id].bots = {}
            }
            db.push("/", data)
            message.react('✅')
            //console.log(ChannelID)
          }
          else {
            message.reply('you need to mention a channel')
            message.react('❌')
          }
        } else {
          message.reply('you don\'t have permissions to do that')
          message.react('❌')
        }
        break;
      case 'add':
        if (message.member.hasPermission('MANAGE_GUILD')) {
          var mention = message.mentions.users.first();
          if (typeof mention === 'undefined') return message.react('❌'), message.reply('you need to mention a bot');
          if (mention.bot === false) return message.reply('this user isnt a bot'), message.react('❌');
          var data = db.getData("/");
          if (typeof data.guild[message.guild.id] !== 'undefined') {
            data.guild[message.guild.id].bots[mention.id] = {
              offlineTimestamp: Date.now(),
              onlineTimestamp: Date.now()
            }
            db.push("/", data);
            message.react('✅')
          }
          else {
            message.reply('you need to setup a brodcastChannel first. please use `' + `${prefix}channel <mention a channel>\``)
            message.react('❌')
          }
        }
        else {

          message.reply('you don\'t have permissions to do that')
          message.react('❌')
        }

        break;
      case 'remove':
        if (message.member.hasPermission('MANAGE_GUILD')) {
          var data = db.getData("/");
          if (typeof data.guild[message.guild.id] !== 'undefined') {
            if (typeof data.guild[message.guild.id].bots !== 'undefined') {
              var mention = message.mentions.users.first();
              if (typeof mention === 'undefined') return message.react('❌'), message.reply('you need to mention a bot');

              if (typeof data.guild[message.guild.id].bots[mention.id] !== 'undefined') {

                delete data.guild[message.guild.id].bots[mention.id]
                db.push("/", data)
                message.react('✅')
              }
              else {
                message.react('❌')
                message.channel.send(new MessageEmbed()
                  .setDescription(`there is no bot called <@${mention.id}> in my database`)
                  .setColor(0xff0000)
                )
                //message.reply(`there is no bot called <@${mention.id}> in my database`)
              }

            }
            else {
              message.react('❌')
            }

          } else {

          }

        }
        else {
          message.reply('you don\'t have permissions to do that')
          message.react('❌')
        }
        break;
      case 'help':

        message.channel.send(new MessageEmbed()
          .setColor(0x00ff00)
          .setTitle('Help')
          .setDescription(`[Invite me](https://discord.com/oauth2/authorize?client_id=818105614055112715&permissions=18496&scope=bot)`)
          .addField('available commands', `
        <> = required; [] = optional 

        \`${prefix}channel <#channel>\`  Set the brodcast cahnnel
        \`${prefix}add <@bot>\`  Add a bot to the list
        \`${prefix}remove <@bot>\`  Remove a bot from the list
        \`${prefix}list\`  List all bots that I monitore
        \`${prefix}help\`  This
      `)
          //.setDescription(``)
        )
        break
    }

  }
});

bot.on('presenceUpdate', (oldPresence, newPresence) => {
  if (typeof oldPresence === 'undefined') return;
  var data = db.getData("/");

  for (let g in data.guild) {
    for (let b in data.guild[g].bots) {
      if (newPresence.user.id === b) {
        if (newPresence.guild.id === g) {
          var offlinefor = prettyMilliseconds(Date.now() - parseInt(data.guild[g].bots[b].offlineTimestamp))
          var onlinefor = prettyMilliseconds(Date.now() - parseInt(data.guild[g].bots[b].onlineTimestamp))
          //console.log('a')
          if (oldPresence.status !== newPresence.status) {
            if (oldPresence.status !== 'offline') {
              if (newPresence.status === 'offline') {

                var channel = newPresence.guild.channels.cache.get(data.guild[g].brodcastChannel)
                channel.send(new MessageEmbed()
                  .setColor('RED')
                  .setTitle('OFFLINE')
                  .setDescription(`the bot ${newPresence.user} has gone offline.`)
                  .addField('Onlinetime:', `\`${onlinefor}\``)
                )
                data.guild[g].bots[b].onlineTimestamp = Date.now();
                data.guild[g].bots[b].offlineTimestamp = Date.now();
                db.push("/", data)
              }
            }
            else {
              var channel = newPresence.guild.channels.cache.get(data.guild[g].brodcastChannel)
              channel.send(new MessageEmbed()
                .setColor('GREEN')
                .setTitle('ONLINE')
                .setDescription(`the bot ${newPresence.user} is now online.`)
                .addField('Offlinetime:', `\`${offlinefor}\``)
              )
              data.guild[g].bots[b].onlineTimestamp = Date.now();
              data.guild[g].bots[b].offlineTimestamp = Date.now();
              db.push("/", data)

            }
          }
        }
      }
    }
  }
});
setInterval(() => {
  bot.user.setPresence({ activity: { name: `in ${bot.guilds.cache.size} servers`, type: 'LISTENING' } })
}, 60000);
bot.login(config.bot_token);