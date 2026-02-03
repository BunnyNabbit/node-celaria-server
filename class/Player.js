const EventEmitter = require("events").EventEmitter
const Vector3 = require("./Vector3.js")
const Packet = require("./Packet.js")
const MapTransmitter = require("./MapTransmitter.js")
const util = require("../util/index.js")

function animationAllowed(animId) {
	return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25].includes(animId)
}

function characterAllowed(charId) {
	return [0, 1, 2].includes(charId)
}

class Player extends EventEmitter {
	/**/
	constructor(socket) {
		super()
		this.socket = socket // null means player is fake/bot and shouldn't be sent packets to or count towards the server list.
		this.netId = 0
		this.udpKey = 0
		this.udpReady = false
		this.udpPort = null
		this.lastUpdateNumber = 0
		this.mapSent = false // TODO: is it actually meaning sent or loaded? Knowing which can be useful for a server

		this.muted = false // not implemented
		this.chatColor = "#ffffff"

		this.destroyed = false
		this.world = null
		this.ready = false

		this.guest = false // Set to true if username received was "PLAYER" or "<Offline>"
		this.username = "Celarian"
		this.steamId = "0"
		this.avatar = {
			character: 0,
			colors: {
				visor: "#ffff00",
				armor: "#ffffff",
				skin: "#c0c0c0",
			},
		}

		this.profile = {
			experience: 0,
			badgeId: 0,
		}

		this.animationLocked = false // Should server update the animation IDs sent by the client?
		this.positionLocked = false // Should server update the positions and rotations sent by the client?
		this.alive = true // This state can mean different things depending on your gamemode. Meant to be compatible with other gamescripts.

		// TODO: Consider using Vector3 here
		this.rawStatus = {
			updateNumber: 0,
			respawnNumber: 0,

			x: 0,
			y: 0,
			z: 0,

			nx: 0,
			ny: 0,
			nz: 0,

			nLen: 0,

			movX: 0,
			movY: 0,
			movZ: 0,

			rotationZ: 0,

			animationID: 25,

			animationStep: 0,
		}

		this.lastStatusSend = new Date()
	}

	refresh() {
		// "Refresh" the player to all other connected clients to receive changes by faking disconnections and reconnections. This is mainly used to change player or bot ego
	}

	roundEnd() {
		const roundEndBuff = new Packet(184) // ROUND_END
		this.socket.write(roundEndBuff.transformPacket("TCP"))
	}

	loadMap(mapBuffer, gamemode = 1, timer = this.world.timer) {
		// Oh. This apparently doesn't work well right now, Celaria really expects rounds to not end right after maps are about to change.
		// pls fix
		// this.roundEnd()

		const mapLoadBuff = new Packet(180) // NEW_MAPLOAD
		mapLoadBuff.writeUInt8(gamemode) // 0: Freeroam, 1: Time trial.
		// Freeroam doesn't start a timer, much like the freeplay mode in singleplayer.
		this.socket.write(mapLoadBuff.transformPacket("TCP"))

		const magicwhatisthisBuff = new Packet(182) // SET_MAPID (Used for what?) According to this https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L824
		// "Magic ids" only exist to make sure the client is loading in the correct maps. May be redundant as this server sends all the map packets to the client at once and disregards their request packets.
		magicwhatisthisBuff.writeUInt16LE(0) // What's a magkic? I don't think this server actually can use this as all the map packets are sent right away, instead of waiting for the client to request more packets.
		this.socket.write(magicwhatisthisBuff.transformPacket("TCP"))

		// Start up a map
		this.mapTransmitter = new MapTransmitter(this)
		this.mapTransmitter.setMapData(mapBuffer)
		this.mapTransmitter.sendAllPackets() // Special function to ignore waiting for the client. might cause problems but whatever, the maps are usually small
		// Now that the client has loaded the map,
		const startGameBuff = new Packet(183) // ROUND_START https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/player/PlayerProcessor.java#L301
		startGameBuff.writeUInt32LE(timer.timeLeft / 10) // Number of tics until round ends. The Celaria client ticks 100 times a second.
		this.socket.write(startGameBuff.transformPacket("TCP"))
	}

	playerCreatePacket() {
		// This is a test
		const playerCreateBuff = new Packet(10) // PLAYER_INFO
		playerCreateBuff.writeUInt8(this.netId) // Netid of player
		playerCreateBuff.writeUInt8(1) // player exists (Why? Alive state?)

		const username = this.username
		playerCreateBuff.writeUInt8(username.length)
		for (let i = 0; i < username.length; i++) {
			// Write UInt16 for each character
			playerCreateBuff.writeUInt16LE(username.charCodeAt(i))
		}

		// Avatar

		// Character
		playerCreateBuff.writeUInt8(this.avatar.character) // 0: Default 1: Runner 2: Collector

		// Skin
		const skin = util.color.hexToRGB(this.avatar.colors.skin)
		playerCreateBuff.writeUInt8(skin[0])
		playerCreateBuff.writeUInt8(skin[1])
		playerCreateBuff.writeUInt8(skin[2])

		// Armor
		const armor = util.color.hexToRGB(this.avatar.colors.armor)
		playerCreateBuff.writeUInt8(armor[0])
		playerCreateBuff.writeUInt8(armor[1])
		playerCreateBuff.writeUInt8(armor[2])

		// Visor
		const visor = util.color.hexToRGB(this.avatar.colors.visor)
		playerCreateBuff.writeUInt8(visor[0])
		playerCreateBuff.writeUInt8(visor[1])
		playerCreateBuff.writeUInt8(visor[2])

		return playerCreateBuff.transformPacket("TCP")
	}

	updateStateForOthers() {
		const statusUpdatePacket = new Packet(1)
		// segment (and only segment btw since this server doesn't batch up statuses)

		statusUpdatePacket.writeUInt8(this.netId) // ID of the player
		statusUpdatePacket.writeUInt8(this.rawStatus.updateNumber % 255) // Update count (should increase)

		statusUpdatePacket.writeUInt8(this.rawStatus.respawnNumber) // Respawn number (to not interpolate when needed)

		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.x))
		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.y))
		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.z))

		// normalize movement vector/direction
		const len = Math.sqrt(this.rawStatus.movX * this.rawStatus.movX + this.rawStatus.movY * this.rawStatus.movY + this.rawStatus.movZ * this.rawStatus.movZ)
		let mX, mY, mZ
		if (len > 0.001) {
			//normalize
			mX = this.rawStatus.movX / len
			mY = this.rawStatus.movY / len
			mZ = this.rawStatus.movZ / len
		} else {
			mX = 0
			mY = 0
			mZ = 0
		}

		// Write normal (This is the direction that Mov(XYZ) contines for smooth movment)
		statusUpdatePacket.writeUInt8(((mX + 1) / 2) * 255)
		statusUpdatePacket.writeUInt8(((mY + 1) / 2) * 255)
		statusUpdatePacket.writeUInt8(((mZ + 1) / 2) * 255)
		// write vecotr length (what)
		statusUpdatePacket.writeUInt8((len / 6) * 255)
		// OK (good)
		statusUpdatePacket.writeUInt8(((this.rawStatus.rotationZ % 360) / 360) * 255)
		statusUpdatePacket.writeUInt8(this.rawStatus.animationID)
		statusUpdatePacket.writeUInt8(this.rawStatus.animationStep * 255)

		statusUpdatePacket.writeUInt8(0) // no more information

		// Broadcast packet into world
		this.world.broadcastExcept(statusUpdatePacket.transformPacket("UDP"), [this], "UDP")
	}

	// Status update meant to be only called by scripting
	fakeUpdateStatus() {
		const statusUpdatePacket = new Packet(1)
		// segment (and only segment btw)

		statusUpdatePacket.writeUInt8(this.netId) // ID of the player

		this.rawStatus.updateNumber++ // Note: players won't be able to use this?
		statusUpdatePacket.writeUInt8(this.rawStatus.updateNumber % 255) // Update count (should increase)

		statusUpdatePacket.writeUInt8(this.rawStatus.respawnNumber) // Respawn number (to not interpolate when needed)

		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.x))
		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.y))
		statusUpdatePacket.writeBuffer(util.compressFloat(this.rawStatus.z))

		// normalize movement vector/direction
		const len = Math.sqrt(this.rawStatus.movX * this.rawStatus.movX + this.rawStatus.movY * this.rawStatus.movY + this.rawStatus.movZ * this.rawStatus.movZ)
		let mX, mY, mZ
		if (len > 0.001) {
			//normalize
			mX = this.rawStatus.movX / len
			mY = this.rawStatus.movY / len
			mZ = this.rawStatus.movZ / len
		} else {
			mX = 0
			mY = 0
			mZ = 0
		}

		// Write normal (This is the direction that Mov(XYZ) contines for smooth movment)
		statusUpdatePacket.writeUInt8(((mX + 1.0) / 2.0) * 255)
		statusUpdatePacket.writeUInt8(((mY + 1.0) / 2.0) * 255)
		statusUpdatePacket.writeUInt8(((mZ + 1.0) / 2.0) * 255)
		// write vecotr length (what)
		statusUpdatePacket.writeUInt8((len / 6.0) * 255)
		// OK (good)
		statusUpdatePacket.writeUInt8(((this.rawStatus.rotationZ % 360) / 360) * 255)
		statusUpdatePacket.writeUInt8(this.rawStatus.animationID)
		statusUpdatePacket.writeUInt8(this.rawStatus.animationStep * 255)

		statusUpdatePacket.writeUInt8(0) // no more information

		// Broadcast packet into world
		this.world.broadcastExcept(statusUpdatePacket.transformPacket("UDP"), [this], "UDP")
	}

	destroy() {
		this.destroyed = true
		if (this.cServer) {
			this.cServer.removePlayer(this)
		}
		if (this.socket && !this.socket.destroyed) this.socket.destroy()
	}

	kick(reason, kickReasonID = 0) {
		// Kick the player and destroy their socket
		if (this.destroyed) return

		const disconnectBuff = new Packet(250)
		disconnectBuff.writeUInt8(kickReasonID) // https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/connection/TcpPlayerWriter.java#L158
		const kickMsg = reason
		disconnectBuff.writeUInt16LE(kickMsg.length)
		for (let i = 0; i < kickMsg.length; i++) {
			// Write UInt16 for each character in kickMsg
			disconnectBuff.writeUInt16LE(kickMsg.charCodeAt(i))
		}
		disconnectBuff.writeString(kickMsg)
		if (this.socket && !this.socket.destroyed) this.socket.write(disconnectBuff.transformPacket("TCP"))

		this.destroy()
	}

	message(message, color = "#ffffff") {
		if (this.destroyed) return
		if (!this.socket) return

		const rgb = util.color.hexToRGB(color)
		const messagePacket = new Packet(200) // CHATMESSAGE
		messagePacket.writeUInt8(rgb[0])
		messagePacket.writeUInt8(rgb[1])
		messagePacket.writeUInt8(rgb[2])
		messagePacket.writeUInt8(message.length)
		for (let i = 0; i < message.length; i++) {
			// Write UInt16 for each character in message
			messagePacket.writeUInt16LE(message.charCodeAt(i))
		}

		this.socket.write(messagePacket.transformPacket("TCP"))
	}
}

module.exports = Player
