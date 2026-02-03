const Player = require("../class/Player.js")
const { SmartBuffer } = require("smart-buffer")
const util = require("./index.js")

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

class Recording {
	/**/
	constructor(data) {
		this.player = null
		this.recording = false
		this.autoAddTics = true
		this.playback = false
		this.playbackBot = null
		this.statusCallback = null
		this.lastStatus = new Date()

		if (!data.username) {
			// Serialized data
			this.data = SmartBuffer.fromBuffer(data)
		} else {
			// A player
			this.data = new SmartBuffer({ size: 100000 })
			this.player = data
			this.data.writeUInt8(0) // Data version

			this.data.writeStringNT(this.player.username) // Username

			// Character
			this.data.writeUInt8(this.player.avatar.character) // 0: Default 1: Runner 2: Collector

			// Skin
			const skin = util.color.hexToRGB(this.player.avatar.colors.skin)
			this.data.writeUInt8(skin[0])
			this.data.writeUInt8(skin[1])
			this.data.writeUInt8(skin[2])

			// Armor
			const armor = util.color.hexToRGB(this.player.avatar.colors.armor)
			this.data.writeUInt8(armor[0])
			this.data.writeUInt8(armor[1])
			this.data.writeUInt8(armor[2])

			// Visor
			const visor = util.color.hexToRGB(this.player.avatar.colors.visor)
			this.data.writeUInt8(visor[0])
			this.data.writeUInt8(visor[1])
			this.data.writeUInt8(visor[2])

			// Start time
			this.data.writeDoubleLE(new Date() - 0)
		}
	}

	startRecordingPlayer() {
		if (!this.player) throw "Can't start recording without player attached"
		this.recording = true
		this.statusCallback = (status) => {
			if (this.autoAddTics) this.addTic(status)
		}
		this.player.on("statusUpdate", this.statusCallback)
	}

	stopRecordingPlayer() {
		if (!this.player) throw "Can't stop recording without player attached"
		this.recording = false
		this.player.off("statusUpdate", this.statusCallback)
		return this.data.toBuffer()
	}

	startPlayback(world) {
		this.data.readOffset = 0
		const bot = new Player(null)

		const dataVersion = this.data.readUInt8()

		bot.username = this.data.readStringNT()
		bot.avatar.character = this.data.readUInt8()
		bot.avatar.colors.skin = util.color.rgbToHex(this.data.readUInt8(), this.data.readUInt8(), this.data.readUInt8())
		bot.avatar.colors.armor = util.color.rgbToHex(this.data.readUInt8(), this.data.readUInt8(), this.data.readUInt8())
		bot.avatar.colors.visor = util.color.rgbToHex(this.data.readUInt8(), this.data.readUInt8(), this.data.readUInt8())

		this.data.readDoubleLE() // time

		world.server.newPlayer(bot)
		world.addPlayer(bot)

		// this.data.replay.forEach(status => {
		// 	setTimeout(() => {
		// 		bot.rawStatus = status
		// 		bot.updateStateForOthers() // We don't use fakeUpdateStatus since the data is based from an actual player
		// 	}, (status.time - this.data.startTime))
		// })

		const playbackFinished = new Promise(async (resolve) => {
			while (this.data.remaining() && !bot.destroyed) {
				await this.readTic(true, bot)
			}

			if (!bot.destroyed) {
				resolve(true)
				bot.destroy()
			} else {
				resolve(false)
			}
		})
		playbackFinished.bot = bot

		return playbackFinished
	}

	async readTic(handleDelay, bot) {
		const delay = this.data.readFloatLE()
		const status = {}
		status.updateNumber = this.data.readUInt8()
		status.respawnNumber = this.data.readUInt8()

		status.x = this.data.readFloatLE()
		status.y = this.data.readFloatLE()
		status.z = this.data.readFloatLE()

		status.nx = (this.data.readUInt8() / 255) * 2 - 1
		status.ny = (this.data.readUInt8() / 255) * 2 - 1
		status.nz = (this.data.readUInt8() / 255) * 2 - 1

		status.nLen = (this.data.readUInt8() / 255) * 3

		status.movX = status.nx * status.nLen
		status.movY = status.ny * status.nLen
		status.movZ = status.nz * status.nLen

		status.rotationZ = (this.data.readUInt8() / 255) * 360

		status.animationID = this.data.readUInt8()
		// if (!animationAllowed(status.animationID)) return bot.kick("Invalid animation ID", 9)
		status.animationStep = this.data.readUInt8() / 255

		if (handleDelay) await sleep(delay)
		if (bot) {
			bot.rawStatus = status
			bot.updateStateForOthers() // We don't use fakeUpdateStatus since the data is based from an actual player or a bot which already used fakeUpdateStatus
		}
		return status
	}

	addTic(status) {
		this.data.writeFloatLE(-(this.lastStatus - new Date()))
		this.lastStatus = new Date()

		this.data.writeUInt8(status.updateNumber % 255) // Update count (should increase)

		this.data.writeUInt8(status.respawnNumber) // Respawn number (to not interpolate when needed)

		this.data.writeFloatLE(status.x)
		this.data.writeFloatLE(status.y)
		this.data.writeFloatLE(status.z)

		// normalize movement vector/direction
		const len = Math.sqrt(status.movX * status.movX + status.movY * status.movY + status.movZ * status.movZ)
		let mX, mY, mZ
		if (len > 0.001) {
			//normalize
			mX = status.movX / len
			mY = status.movY / len
			mZ = status.movZ / len
		} else {
			mX = 0
			mY = 0
			mZ = 0
		}

		// Write normal (This is the direction that Mov(XYZ) contines for smooth movment)
		this.data.writeUInt8(((mX + 1) / 2) * 255)
		this.data.writeUInt8(((mY + 1) / 2) * 255)
		this.data.writeUInt8(((mZ + 1) / 2) * 255)
		// write vecotr length (what)
		this.data.writeUInt8((len / 6) * 255)
		// OK (good)
		this.data.writeUInt8(((status.rotationZ % 360) / 360) * 255)
		this.data.writeUInt8(status.animationID)
		this.data.writeUInt8(status.animationStep * 255)
	}
}

module.exports = Recording
