const SmartBuffer = require("smart-buffer").SmartBuffer
const Packet = require("../class/Packet.js")
const { rgbToHex } = require("../util/color.js")

function characterAllowed(charId) {
	return [0, 1, 2].includes(charId)
}

function tcpPacketHandler(socket, player, buff) {
	try {
		if (buff.readString(4) !== "CCPT") return player.kick("Wrong TCP packet header#This shouldn't happen to users connecting to this server with Celaria, if it did then please report this to BunnyNabbit.", 9)
		const packetId = buff.readUInt8()
		const packetSize = buff.readUInt16LE()
		switch (packetId) {
			case 1: // TODO: We don't know what this packet is or called (by name).
				const gameVersion = buff.readUInt16LE()
				const onlineMode = buff.readUInt8()
				if (onlineMode === 0) return player.kick("how?", 10) // ONLINEMODE_REQUIRED

				// TODO: Check if the information can be resent after the first. Mainly to change the UDP rate.
				const serverInfoBuff = new Packet(1) // SERVER_INFO https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L52
				serverInfoBuff.writeUInt8(1) // Does nothing. I swear! omve on.

				serverInfoBuff.writeUInt8(0) // TODO: We don't use passwords yet https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L565

				serverInfoBuff.writeUInt8(10) // UDP refresh rate for client
				socket.write(serverInfoBuff.transformPacket("TCP"))
				break
			case 3: // Player information
				if (player.world) return player.kick("Player information can't be sent twice", 9)
				if (player.cServer.maxPlayers <= player.cServer.getRealPlayers().length) return player.kick("", 2)
				const usernameLength = buff.readUInt8()

				player.username = ""
				for (let i = 0; i < usernameLength; i++) {
					player.username += String.fromCharCode(buff.readUInt16LE())
				}

				// There are a few cases where a player is named PLAYER. I am not exactly sure what causes this name to show up but I would assume it's some sort of placeholder steam name if one couldn't be found. This section detect those usernames and give players a more identifiable username. 
				// Very small list of handpicked adjectives. (adjective-animal)
				const adjectives = ["Average", "Breezy", "Quick", "Energetic", "Common", "Natural", "Typical", "Stable", "Fellow", "Persistent", "Robust", "Dynamic Typed"]
				if (player.username === "PLAYER" || player.username === "<Offline>") {
					player.username = `${adjectives[randomIntFromInterval(0, adjectives.length - 1)]} Celarian`
					player.guest = true
				}

				// This information seems easy to spoof. Not a reliable way to find WIW
				player.steamId = buff.readBigUInt64LE().toString()

				player.avatar.character = buff.readUInt8()
				if (characterAllowed(player.avatar.character) === false) return player.kick("Invalid character ID", 9) // Allowing invalid characters would cause other clients to crash. Not good.
				player.avatar.colors.skin = rgbToHex(buff.readUInt8(), buff.readUInt8(), buff.readUInt8())
				player.avatar.colors.armor = rgbToHex(buff.readUInt8(), buff.readUInt8(), buff.readUInt8())
				player.avatar.colors.visor = rgbToHex(buff.readUInt8(), buff.readUInt8(), buff.readUInt8())

				player.cServer.newPlayer(player) // Put netId and udpKey into player and put him into the server array

				const clientInfoConfirmationBuff = new Packet(8) // CLIENT_INFO_CONFIRM: Tell the client the server got their information and accepted their connection (and what?)
				clientInfoConfirmationBuff.writeUInt8(player.netId)
				clientInfoConfirmationBuff.writeUInt16LE(player.udpKey)
				socket.write(clientInfoConfirmationBuff.transformPacket("TCP"))

				// Player is now in the game (and world)
				player.cServer.defaultWorld.addPlayer(player)
				player.cServer.emit("playerJoin", player)

				// Greet
				const MOTD = player.cServer.MOTD
				if (MOTD.message) {
					if (Array.isArray(MOTD.message)) {
						MOTD.message.forEach(message => {
							player.message(message, MOTD.color)
						})
					} else {
						player.message(MOTD.message, MOTD.color)
					}
				}
				player.cServer.messageAll(`${player.username} has joined the server`, "#00ff00")
				break
			case 4: // Player ranking status update https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L704
				const oldProfile = JSON.parse(JSON.stringify(player.profile))
				player.profile.experience = buff.readUInt32LE()
				player.profile.badgeId = buff.readUInt8()
				const newProfile = player.profile

				player.emit("updateRank", newProfile, oldProfile)
				// TODO: Update leaderboard (when it's implemented)
				break
			case 6: // Received map
				// TODO: Check if this means that the client received all map packets or has loaded up the map completely.
				player.emit("mapReceived")
				break
			case 120: // Leaderboard request https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L727
				const type = buff.readUInt8()
				let offset = buff.readUInt8()
				if (type == 1) offset = 0 // Post-game leaderboard
				const length = buff.readUInt8()
				const showOwnEntry = buff.readUInt8()
				if (player.world) {
					const entriesInView = player.world.leaderboard.slice(offset, offset + length)
					const leaderboardBuffer = new Packet(120, "TCP")
					leaderboardBuffer.writeUInt8(type) // Type of leaderboard (post-game or in-game)
					leaderboardBuffer.writeUInt8(player.world.leaderboard.length)
					// Does the leaderboard contain the player's own entry?
					const ownEntry = player.world.leaderboard.find(entry => entry.player === player)
					const containsOwnEntry = Number(Boolean(ownEntry))
					leaderboardBuffer.writeUInt8(entriesInView.length + containsOwnEntry) // Number of entries found in the current view
					leaderboardBuffer.writeUInt8(containsOwnEntry)
					let newPlace = 0
					function writeEntry(entry, placement) {
						newPlace++
						if (!placement) placement = newPlace
						leaderboardBuffer.writeUInt8(placement)
						leaderboardBuffer.writeUInt8(entry.player.netId)
						leaderboardBuffer.writeUInt8(entry.player.username.length)
						for (let i = 0; i < entry.player.username.length; i++) { // I feel like this might have a problem. Usually all other ways of writing strings use UInt16LE
							leaderboardBuffer.writeUInt8(entry.player.username.charCodeAt(i))
						}
						leaderboardBuffer.writeUInt8(entry.player.profile.badgeId)
						if (entry.time != 0) {
							leaderboardBuffer.writeUInt8(1)
							leaderboardBuffer.writeUInt32LE(entry.time)
							leaderboardBuffer.writeUInt8(entry.medal)
						} else {
							leaderboardBuffer.writeUInt8(0)
						}
					}
					entriesInView.forEach(entry => {
						writeEntry(entry)
					})
					if (containsOwnEntry) writeEntry(ownEntry, player.world.leaderboard.findIndex(entry => entry.player === player) + 1)
					socket.write(leaderboardBuffer.transformPacket())
				}
				break
			case 200: // Chat
				// TODO: Make this robust. It should be possible to replace the chat handler and add in filtering.
				const message = buff.readString(packetSize).substring(0, 85).trim()
				if (!player.world) break

				// Handle commands
				const words = message.split(" ")
				const firstWord = words[0]
				let commandIssued = false
				player.cServer.commands.forEach(cmd => {
					if (Array.isArray(cmd.name)) {
						if (cmd.name.includes(firstWord)) {
							cmd.callback(player, words.slice(1, words.length).join(""))
							commandIssued = true
						}
					} else {
						if (cmd.name === firstWord) {
							cmd.callback(player, words.slice(1, words.length).join(""))
							commandIssued = true
						}
					}
				})
				if (commandIssued) break

				if (player._chatCooldown) {
					player.message("You're chatting too fast!")
					break
				}
				player._chatCooldown = true
				setTimeout(() => {
					player._chatCooldown = null
				}, 2000)

				const showId = player.cServer.players.some(other => other !== player && other.username === player.username)
				// const showId = player.cServer.players.some(other => other.socket && other !== player && other.username === player.username)
				if (message.length) {
					let adornments = ""
					if (showId) adornments += `[${player.netId}]` // Muliple users could have the same username
					adornments += ":"
					player.world.messageAll(`${player.username}${adornments} ${message}`, player.chatColor)
					player.emit("chatted", message)
				}
				break
			case 201: // Restart run
				// The way that this is triggered seems to be broken, The client doesn't always send this on certain run resets. Use player respawn instead.
				// player.emit("reset")
				break
			case 202: // Activate checkpoint
				if (!player.world) return player.kick("Foul checkpoint activation", 9)
				player.emit("checkpoint", buff.readUInt32LE())
				break
			case 203: // Reach goal
				if (!player.world) return player.kick("Foul goal activation", 9)
				player.emit("goal", buff.readUInt32LE())
				break
			case 210: // TCP keepalive (no extra data)
				break
			case 240: // Client considers the UDP connection to be ready after receiving the server to client UDP test packet
				if (player.udpReady) break
				player.udpReady = true
				player.loadMap(player.world.mapBuffer)
				break
			case 199: // MapTransmitter: Client request for next fragment (Ignored by sending all packets to the client)
				// if (!player.mapTransmitter) return player.kick("mapTransmitter is missing", 9)
				// player.mapTransmitter.sendPacket() // Disabled for now since the server sends all packets at once
				const requestedMapID = buff.readUInt16LE()
				break
			case 10: // "LOL who is thgis mannn". The client tells the server they see a player. Why does this exist?
				buff.readUInt8() // The other player ID
				// TODO: Is it actually used? And for what purpose would it even be used for? WHy?
				break
			default:
				break
		}
		// console.log({ packetId, packetSize, remainingBytes: buff.remaining() })
		// Not the best way but the packets are small so it doesn't quite matter. i think
		if (buff.remaining()) tcpPacketHandler(socket, player, buff)
	} catch (error) {
		console.error(error)
		if (player.cServer.sendError) {
			player.kick(`node-celaria-server error during TCP packet handling#${error.name}: ${error.message}`)
		} else {
			player.kick(`node-celaria-server error during TCP packet handling#[error hidden]`)
		}
	}
}

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

module.exports = tcpPacketHandler