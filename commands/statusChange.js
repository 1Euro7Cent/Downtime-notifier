const { Client, CommandInteraction, MessageEmbed, TextChannel } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { JsonDB } = require('node-json-db')
const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../tools')
const prettyMs = require('pretty-ms')
const defaultTexts = require('./../texts.json')

let currentTexts = structuredClone(defaultTexts)

// let db = new JsonDB(new Config("database", false, true, '/'))

/**
 * 
 * @param {Client} bot 
 * @param {*} user 
 * @param {*} tUser 
 * @param {*} type 
 * @returns 
 */

function getMessage(bot, user, tUser, type) {
	let t = type == 'online' ? tUser.wentOffline : tUser.wentOnline
	let unsure = bot.uptime < Date.now() - t
	// console.log(t)
	let embed = new MessageEmbed()
		// .setTitle(`Bot went ${type}`)
		.setTitle(currentTexts.statusChange[type].title
			.replaceAll('{name}', user.username)
			.replaceAll('{type}', user.bot ? 'Bot' : 'User')
			.replaceAll('{status}', type)
		)
		// .setDescription(`The bot \`${user.username}\` is now \`${type}\` `)
		.setDescription(currentTexts.statusChange[type].description
			.replaceAll('{name}', user.username)
			.replaceAll('{type}', user.bot ? 'Bot' : 'User')
			.replaceAll('{status}', type)
		)
		.setColor(type == 'offline' ? 0xff0000 : 0x00ff00)
		.addFields([
			{
				name: `${type == "offline" ? "online" : "offline"}time`,
				value: `\`${t ? prettyMs(Date.now() - t, { verbose: true }) + (unsure ? " (unsure)" : "") : "Unknown"}\``,
			},
		])
	return {
		embeds: [embed]
	}

}

/**
 * @param {{ embeds: MessageEmbed[] }} mesData
 * @param {User} user
 * @param {*} notifications
 * @returns {{ embeds: MessageEmbed[], content: string } | { embeds: MessageEmbed[] }}
 */
function insertPings(mesData, user, notifications) {
	if (!user) return mesData
	let users = []

	for (let toNotify in notifications) {
		for (let u of notifications[toNotify]) {
			if (u == 'all') {
				users.push(toNotify)
				continue
			}
			if (u == user.id) {
				users.push(toNotify)
			}
		}
	}

	// console.log(users)
	if (users.length == 0) return mesData

	return {
		embeds: mesData.embeds,
		content: users.length > 0 ? users.map(u => `<@${u}>`).join(' ') : ''
	}

}

module.exports = {
	disabled: false,
	noCommand: true,
	/**
	 * this runs on startup
	 * @param {Client} bot
	 * @param {JsonDB} db
	 */
	async startup(bot, db, errorMessager) {
		console.log('---- Initializing StatusChangeListener ----')
		bot.on('presenceUpdate', async (oldPresence, newPresence) => {
			if (!oldPresence) return
			// db.reload()
			try {
				let usrID = newPresence.user?.id || oldPresence.user?.id || newPresence.userId || oldPresence.userId
				let data = db.getData('/')
				let gData = data[newPresence.guild.id]
				if (!gData || !gData.broadcastChannel) return

				// set the texts
				currentTexts = structuredClone(defaultTexts)

				if (gData.texts?.offlineTitle) currentTexts.statusChange.offline.title = gData.texts.offlineTitle
				if (gData.texts?.onlineTitle) currentTexts.statusChange.online.title = gData.texts.onlineTitle
				if (gData.texts?.offlineDescription) currentTexts.statusChange.offline.description = gData.texts.offlineDescription
				if (gData.texts?.onlineDescription) currentTexts.statusChange.online.description = gData.texts.onlineDescription

				if (gData.texts?.offlineTimeName) currentTexts.statusChange.offline.timeName = gData.texts.offlineTimeName
				if (gData.texts?.onlineTimeName) currentTexts.statusChange.online.timeName = gData.texts.onlineTimeName

				for (let user in gData.users) {
					if (gData.users[user].id == usrID) {
						let usr = newPresence.user || await bot.users.fetch(usrID).catch(e => null)
						// if the user gone online
						if (oldPresence.status == 'offline' && newPresence.status != 'offline') {
							let mes = getMessage(bot, usr, gData.users[user], 'online')
							mes = insertPings(mes, usr, gData.notifications)
							console.log(`${usr.username} went online`)
							/**
							 * @type {TextChannel}
							 */

							// @ts-ignore
							let channel = await bot.channels.cache.get(gData.broadcastChannel)


							gData.users[user].wentOnline = Date.now()
							if (channel && tools.hasPermissionToSendMessages(channel)) {
								await channel.send(mes).catch((e) => {
									if (errorMessager(channel, e)) return
									// remove from db
									gData.users.splice(user, 1)
									console.log(`Removed ${usr.username} from the database`)

								})
							}
							else {
								gData.broadcastChannel = null
								console.log(`Removed broadcast channel of ${usr.username}`)
							}
						}
						// if the user went offline
						if (oldPresence.status != 'offline' && newPresence.status == 'offline') {
							let mes = getMessage(bot, usr, gData.users[user], 'offline')
							mes = insertPings(mes, usr, gData.notifications)

							console.log(`${usr.username} went offline`)
							/**
							 * @type {TextChannel}
							 */

							// @ts-ignore
							let channel = await bot.channels.cache.get(gData.broadcastChannel)

							gData.users[user].wentOffline = Date.now()
							if (channel && tools.hasPermissionToSendMessages(channel)) {
								await channel.send(mes).catch((e) => {
									errorMessager(channel, e)
									// remove from db

									gData.users.splice(user, 1)
									console.log(`Removed ${usr.username} from the database`)
								})
							}
							else {
								gData.broadcastChannel = null
								console.log(`Removed broadcast channel of ${usr.username}`)
							}

						}
						// data.users = gData.users
						db.push('/', data)
					}

				}
				// db.save()
			} catch (e) {
				errorMessager(undefined, e)
			}
		})
		// console.log(bot.eventNames())
	},
}