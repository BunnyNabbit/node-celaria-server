const EventEmitter = require("events").EventEmitter
const Vector3 = require("./Vector3.js")
const Packet = require("./Packet.js")
const util = require("../util/index.js")
const cmapLib = require("../data/cmapLib.js")
const Timer = require("./Timer.js")

class World extends EventEmitter {
	constructor(server) {
		super()
		this.server = server
		this.players = []
		this.mapBuffer = cmapLib.writeCelariaMap({}) // Empty map
		this.map = cmapLib.parseCelariaMap(this.mapBuffer)
		this.leaderboard = []
		this.timer = new Timer()

		this.timer.on("extend", (time) => { // Update time
			const timeExtendPacket = new Packet(20, "TCP")
			timeExtendPacket.writeUInt32LE(Math.round(time / 1000))
			this.broadcast(timeExtendPacket.transformPacket())
		})
	}

	updateLeaderboardEntry(player, time, medal) {
		if (!player.socket) return
		const newEntry = { player, time, medal }

		const existingEntry = this.leaderboard.find(entry => entry.player === player)
		if (existingEntry) {
			if (existingEntry.time < newEntry.time) {
				existingEntry.time = newEntry.time
				existingEntry.medal = newEntry.medal
			}
		} else {
			this.leaderboard.push(newEntry)
		}
		function fx(time) { // yep, this is how to sort those entries with no times
			if (time == 0) return Infinity
			return time
		}
		this.leaderboard.sort((a, b) => fx(a.time) - fx(b.time))
	}

	switchMap(mapBuffer) {
		this.mapBuffer = mapBuffer
		this.players.forEach(player => {
			if (player.socket) player.loadMap(mapBuffer, 1)
		})
	}

	messageAll(message, color = "#ffffff") {
		this.players.forEach(player => {
			if (player.socket) player.message(message, color)
		})
	}

	removePlayer(player) {
		const playerIndex = this.players.indexOf(player)
		if (playerIndex) this.players.splice(playerIndex, 1)
		const leaderboardIndex = this.leaderboard.findIndex(entry => entry.player === player)
		if (leaderboardIndex !== -1) this.leaderboard.splice(leaderboardIndex, 1)

		// Send player disconnect packet to remove the player on other clients
		const offlinePacket = new Packet(11) // PLAYER_DISCONNECT
		offlinePacket.writeUInt8(player.netId)
		this.broadcast(offlinePacket.transformPacket("TCP"))
	}

	addPlayer(player) {
		player.world = this
		if (player.socket) {
			this.players.forEach(other => {
				player.socket.write(other.playerCreatePacket())
			})
		}
		const packet = player.playerCreatePacket()
		this.broadcastExcept(packet, [player], "TCP")
		this.players.push(player)
		this.updateLeaderboardEntry(player, 0, 0)
	}

	broadcast(buffer) { // TODO: Needs to implement UDP
		this.players.forEach(player => {
			if (player.socket) player.socket.write(buffer)
		})
	}

	broadcastExcept(buffer, players, protocol) {
		this.players.forEach(player => {
			if (players.includes(player) === false) {
				if (protocol === "TCP") {
					if (player.socket) player.socket.write(buffer)
				} else if (protocol === "UDP") {
					if (player.socket && player.udpPort !== null) this.server.udpServer.send(buffer, player.udpPort, player.socket.remoteAddress)
				}
			}
		})
	}
}

module.exports = World