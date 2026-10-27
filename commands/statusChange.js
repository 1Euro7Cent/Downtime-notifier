const { Client, CommandInteraction, MessageEmbed, TextChannel, User } = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
// const { JsonDB } = require('node-json-db')
// const { Config } = require('node-json-db/dist/lib/JsonDBConfig')
const tools = require('../src/tools')
const prettyMs = require('pretty-ms')
const defaultTexts = require('./../texts.json')

let currentTexts = structuredClone(defaultTexts)

// let db = new JsonDB(new Config("database", false, true, '/'))

let delayedSends = [
	// {
	// 	secondsRemaining: 0,
	// 	totalWaitSeconds: 0,
	// 	bot: null,
	// 	channel: null,
	// 	messageData: null,
	//  goneOnline: false,
	//  userId: null,
	// }
]

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
 * @param {{guildId: string, mentionUserId: string, watchId: string}[]} notifications
 * @returns {{ embeds: MessageEmbed[], content: string } | { embeds: MessageEmbed[] }}
 */
function insertPings(mesData, notifications) {
	let users = notifications.map(notification => notification.mentionUserId)
	if (users.length == 0) return mesData

	return {
		embeds: mesData.embeds,
		content: users.map(userId => `<@${userId}>`).join(' ')
	}

}

module.exports = {
	disabled: false,
	noCommand: true,
	interval: 1000, // 1 second

	/**
	 *
	 * @param {Client} bot
	 * @param {import('node:sqlite').DatabaseSync} database
	 * @param {*} errorMessager
	 */
	async timed(bot, database, errorMessager) {
		// console.log('---- Running delayed sends check ----')

		// Process delayed sends
		for (let i = delayedSends.length - 1; i >= 0; i--) {
			let ds = delayedSends[i]
			ds.secondsRemaining--

			if (ds.secondsRemaining <= 0) {
				// Time to send the message
				console.log(`Sending delayed ${ds.goneOnline ? 'online' : 'offline'} notification`)
				try {
					await ds.channel.send(ds.messageData)
				} catch (e) {
					errorMessager(ds.channel, e)

					console.error('Failed to send delayed message:', e.message)
				}
				// Remove from array
				delayedSends.splice(i, 1)
			}
		}
	},
	/**
	 * this runs on startup
	 * @param {Client} bot
	 * @param {import('node:sqlite').DatabaseSync} database
	 */
	async startup(bot, database, errorMessager) {
		console.log('---- Initializing StatusChangeListener ----')
		bot.on('presenceUpdate', async (oldPresence, newPresence) => {
			if (!oldPresence) return
			try {
				let usrID = newPresence.user?.id || oldPresence.user?.id || newPresence.userId || oldPresence.userId

				let broadcastChannel = database.prepare('SELECT broadcastChannelId FROM guilds WHERE guildId = ?').get(newPresence.guild.id)?.broadcastChannelId

				if (typeof broadcastChannel !== 'string') return
				broadcastChannel = broadcastChannel.trim()
				if (!/^\d+$/.test(broadcastChannel)) {
					console.error(`Invalid broadcast channel ID for guild ${newPresence.guild.id}; clearing it`)
					database.prepare('UPDATE guilds SET broadcastChannelId = NULL WHERE guildId = ?').run(newPresence.guild.id)
					return
				}
				// console.log("broadcastChannel", broadcastChannel)

				// get custom texts if available

				let customTexts = database.prepare('SELECT * FROM texts WHERE guildId = ?').get(newPresence.guild.id)


				// set the texts
				currentTexts = structuredClone(defaultTexts)

				if (customTexts?.offlineTitle) currentTexts.statusChange.offline.title = customTexts.offlineTitle
				if (customTexts?.onlineTitle) currentTexts.statusChange.online.title = customTexts.onlineTitle
				if (customTexts?.offlineDescription) currentTexts.statusChange.offline.description = customTexts.offlineDescription
				if (customTexts?.onlineDescription) currentTexts.statusChange.online.description = customTexts.onlineDescription

				// check if the user is in the database under this guild

				let user = database.prepare('SELECT * FROM users WHERE guildId = ? AND userId = ?').get(newPresence.guild.id, usrID)
				// console.log("user", user)

				if (!user) return

				let timeThreshold = user.downThreshold || 0
				let usr = newPresence.user || await bot.users.fetch(usrID).catch(e => null)

				let notifications = database.prepare('SELECT * FROM notifications WHERE guildId = ? AND watchId = ?').all(newPresence.guild.id, user.userId)
				// if the user gone online
				if (oldPresence.status == 'offline' && newPresence.status != 'offline') {
					let mes = getMessage(bot, usr, user, 'online')
					mes = insertPings(mes, notifications)
					console.log(`${usr.username} went online. waiting for threshold of ${timeThreshold}seconds`)
					/**
					 * @type {TextChannel}
					 */

					// @ts-ignore
					let channel = await newPresence.guild.channels.fetch(broadcastChannel)

					// console.log("channel", channel)
					// console.log("hasPermissionToSendMessages", tools.hasPermissionToSendMessages(channel))


					database.prepare('UPDATE users SET wentOnline = ? WHERE guildId = ? AND userId = ?').run(Date.now(), newPresence.guild.id, usrID)
					if (channel && tools.hasPermissionToSendMessages(channel)) {
						if (timeThreshold == 0) {
							await channel.send(mes).catch((e) => {
								if (errorMessager(channel, e)) return
								// remove from db

								database.prepare('DELETE FROM users WHERE guildId = ? AND userId = ?').run(newPresence.guild.id, usrID)


								console.log(`Removed ${usr.username} from the database`)

							})
						}
						else {
							console.log(`Scheduling message to be sent in ${timeThreshold} seconds`)
							// add to array
							// if already scheduled for opposite status change, remove and dont add a new one
							let existingIndex = delayedSends.findIndex(ds => ds.bot == bot && ds.channel.id == channel.id && ds.goneOnline == false && ds.userId == usrID)


							if (existingIndex != -1) {
								console.log(`Found existing scheduled offline message for ${usr.username}, removing it`)
								delayedSends.splice(existingIndex, 1)
							}
							else {
								console.log(`No existing scheduled offline message for ${usr.username} found, adding new one`)
								delayedSends.push({
									secondsRemaining: timeThreshold,
									totalWaitSeconds: timeThreshold,
									bot: bot,
									channel: channel,
									messageData: mes,
									goneOnline: true,
									userId: usrID,
								})


							}
						}
					}
					else {
						database.prepare('UPDATE guilds SET broadcastChannelId = NULL WHERE guildId = ?').run(newPresence.guild.id)
						console.log(`Removed broadcast channel of ${usr.username}`)
					}
				}
				// if the user went offline
				if (oldPresence.status != 'offline' && newPresence.status == 'offline') {
					let mes = getMessage(bot, usr, user, 'offline')
					mes = insertPings(mes, notifications)

					console.log(`${usr.username} went offline. waiting for threshold of ${timeThreshold}seconds`)
					/**
					 * @type {TextChannel}
					 */

					// @ts-ignore
					let channel = await newPresence.guild.channels.fetch(broadcastChannel)

					database.prepare('UPDATE users SET wentOffline = ? WHERE guildId = ? AND userId = ?').run(Date.now(), newPresence.guild.id, usrID)
					if (channel && tools.hasPermissionToSendMessages(channel)) {
						if (timeThreshold == 0) {
							await channel.send(mes).catch((e) => {
								if (errorMessager(channel, e)) return
								// remove from db

								database.prepare('DELETE FROM users WHERE guildId = ? AND userId = ?').run(newPresence.guild.id, usrID)
								console.log(`Removed ${usr.username} from the database`)
							})
						}
						else {
							console.log(`Scheduling offline message to be sent in ${timeThreshold} seconds`)
							// if already scheduled for opposite status change, remove and dont add a new one
							let existingIndex = delayedSends.findIndex(ds => ds.bot == bot && ds.channel.id == channel.id && ds.goneOnline == true && ds.userId == usrID)

							if (existingIndex != -1) {
								console.log(`Found existing scheduled online message for ${usr.username}, removing it`)
								delayedSends.splice(existingIndex, 1)
							}
							else {
								console.log(`No existing scheduled online message for ${usr.username} found, adding new offline message`)
								delayedSends.push({
									secondsRemaining: timeThreshold,
									totalWaitSeconds: timeThreshold,
									bot: bot,
									channel: channel,
									messageData: mes,
									goneOnline: false,
									userId: usrID,
								})
							}
						}
					}
					else {
						database.prepare('UPDATE guilds SET broadcastChannelId = NULL WHERE guildId = ?').run(newPresence.guild.id)
						console.log(`Removed broadcast channel of ${usr.username}`)
					}

				}
			} catch (e) {
				errorMessager(undefined, e)
			}
		})
		// console.log(bot.eventNames())
	},
}