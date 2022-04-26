const EventEmitter = require("events").EventEmitter

const World = require("./class/World.js")
const Player = require("./class/Player.js")
const cmapLib = require("./data/cmapLib.js")
const Recording = require("./class/Recording.js")

const qs = require("qs")
const axios = require("axios")

const SmartBuffer = require("smart-buffer").SmartBuffer
const Packet = require("./class/Packet.js")

const tcpPacketHandler = require("./net/tcpPacketHandler.js")

const net = require('net')
const dgram = require("dgram")

const util = require("./util/index.js")

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

function animationAllowed(animId) {
	return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25].includes(animId)
}

class Server extends EventEmitter {
	constructor(props) {
		super()
		this.worlds = [new World(this)]
		this.defaultWorld = this.worlds[0]
		this.commands = []
		this.maxPlayers = props.maxPlayers ?? 16
		this.players = []
		this.jail = [] // (unimplemented) Holds banned IPs from clients voilating the protocol
		// this is kinda dumb, should it even be implemented at all?
		this.tarpitEnabled = props.tarpit ?? false // (unimplemented) Makes server also act as a HTTP tarpit
		this.tarpit = []
		this.tcpServer = null
		this.udpServer = null
		this.port = props.port ?? 6511
		this.name = props.name || "ncs Server"
		this.MOTD = {
			message: [`This server proudly uses node-celaria-server!`],
			color: "#80ffff"
		}
		this.sendError = props.sendError ?? false
		this.statusSendRatelimit = props.statusSendRatelimit ?? 48 // Time in MS before server will accept another status update from a client
		this.mapCollection = props.mapCollection ?? [] // For default mode or compatible server scripts. Contains .cmap buffers.
		this.useDefault = props.useDefault ?? true // If enabled, the rounds system will be active
		this.postToMasterServer = props.postToMasterServer ?? true

		if (!props.disableFunctions) this.functions = {
			World,
			Player,
			Packet,
			cmapLib,
			Recording,
			util
		}
	}

	// Send a message to all players in the server
	messageAll(message, color = "#ffffff") {
		this.players.forEach(player => {
			if (player.socket) player.message(message, color)
		})
	}

	getPlayerKey() {
		let key = randomIntFromInterval(0, 65535)
		if (this.players.some(player => player.udpKey == key) == false) return key
		return this.getPlayerKey()
	}
	getPlayerId() {
		for (let i = 0; i < 256; i++) {
			if (!this.players.some(player => player.netId == i)) return i
		}
		throw "Unable to generate unique player ID"
	}
	getRealPlayers() {
		return this.players.filter(player => player.socket)
	}

	newPlayer(player) {
		player.cServer = this
		player.netId = this.getPlayerId()
		player.udpKey = this.getPlayerKey()
		this.players.push(player)
	}

	removePlayer(player) {
		this.players.splice(this.players.indexOf(player), 1)
		if (player.world) player.world.removePlayer(player)
	}

	command(name, callback) {
		const cmd = { name, callback }
		function remove() {
			this.commands.splice(this.commands.indexOf(cmd), 1)
		}
		this.commands.push(cmd)
		return remove
	}

	_postServer() {
		const apiVersion = 1

		const form = {
			SERVERNAME: this.name,
			PORT: this.port.toString(),

			PLAYERCOUNT: this.getRealPlayers().length.toString(),
			MAXPLAYERCOUNT: this.maxPlayers.toString(),

			VERSION: "4", // Protocol version
			PASSWORD: "0",
			MODDED: "1" // no touch
		}
		const API = `https://serverapi.celaria.com/${apiVersion}/register.php`
		axios.post(API, qs.stringify(form)).catch(() => { })
	}

	start() {
		this.tcpServer = net.createServer((socket) => { // TCP Handler
			const player = new Player(socket) // This player isn't added to any World until it has been validated
			player.cServer = this
			socket.setNoDelay(true)
			socket.on("error", () => {
				return socket.destroy()
			})
			socket.once('close', () => {
				if (player.world) {
					this.emit("playerLeave", player)
				}
				player.destroy()
			})
			socket.on('data', (data) => {
				tcpPacketHandler(socket, player, SmartBuffer.fromBuffer(data))
			})
		})

		this.udpServer = dgram.createSocket({ type: 'udp6' })

		// TODO: The UDP Handler should be in ithsssss (cying) iownOWN fFILE
		const UDP_PACKET_HEADER = 1431323459
		this.udpServer.on('message', (data, rinfo) => { // UDP Handler
			try {
				const buff = SmartBuffer.fromBuffer(data)
				if (buff.readUInt32LE() !== UDP_PACKET_HEADER) return // Header
				const playerId = buff.readUInt8()
				const packetId = buff.readUInt8()
				const playerKey = buff.readUInt16LE()
				const player = this.players.find(player => player.udpKey === playerKey) // Find player with the same UDP key
				if (!player) return
				player.udpPort = rinfo.port
				switch (packetId) {
					case 1: // Player state data (positions, animations, etc)
						const status = {}
						status.updateNumber = buff.readUInt8()
						status.respawnNumber = buff.readUInt8()

						if (!player.positionLocked) {
							status.x = buff.readFloatLE()
							status.y = buff.readFloatLE()
							status.z = buff.readFloatLE()

							status.nx = ((buff.readUInt8() / 255) * 2) - 1
							status.ny = ((buff.readUInt8() / 255) * 2) - 1
							status.nz = ((buff.readUInt8() / 255) * 2) - 1

							status.nLen = (buff.readUInt8() / 255) * 3

							status.movX = status.nx * status.nLen
							status.movY = status.ny * status.nLen
							status.movZ = status.nz * status.nLen

							status.rotationZ = (buff.readUInt8() / 255) * 360
						} else {
							buff.readFloatLE()
							buff.readFloatLE()
							buff.readFloatLE()
							status.x = player.rawStatus.x
							status.y = player.rawStatus.y
							status.z = player.rawStatus.z

							buff.readUInt8()
							buff.readUInt8()
							buff.readUInt8()
							status.nx = 0
							status.ny = 0
							status.nz = 0

							buff.readUInt8()
							status.nLen = 0

							status.movX = 0
							status.movY = 0
							status.movZ = 0

							buff.readUInt8()
							status.rotationZ = player.rawStatus.rotationZ
						}

						if (!player.animationLocked) {
							status.animationID = buff.readUInt8()
							if (!animationAllowed(status.animationID)) return player.kick("Invalid animation ID", 9)
							status.animationStep = buff.readUInt8() / 255
						} else {
							status.animationID = player.rawStatus.animationID
							status.animationStep = player.rawStatus.animationStep
						}

						// funny stuff that original server does
						let applyRegardless = false
						if ((status.updateNumber >> 7) != (player.lastUpdateNumber >> 7)) {
							applyRegardless = true
						}

						if (player.lastUpdateNumber < status.updateNumber || applyRegardless) {
							// apply everything
							const playerRespawned = player.rawStatus.respawnNumber !== status.respawnNumber
							player.rawStatus = status
							player.emit("statusUpdate", status)
							if (playerRespawned) player.emit("respawn")
							if (!player.broadcastStatusDisabled) {
								// Note: In this server, all statuses are sent in their own separate packet. No status updates are ever bundled together in one packet.
								// This could mean that responses will be faster but may take up more bandwidth due to the packet overheads.
								// Doing it this way also helps when programming with the functions, as you control when packets are sent.
								if (-(player.lastStatusSend - new Date()) > this.statusSendRatelimit) { // precaution
									player.lastStatusSend = new Date()
									player.updateStateForOthers()
								}
							}
						}
						break
					case 10: // UDP test packet
						// Already handled before this and by the UDP test and ping interval
						break

					default: // Consider kicking players?
						break
				}
			} catch (error) {
				console.warn("Error caused by UDP packet handler:", error)
			}
		})

		setInterval(() => { // send keepalives and pings both TCP and UDP. not based on the server tick speed as this server doesn't use such thing.
			this.players.forEach(player => {
				try {
					// Player could be a bot (null socket)
					if (!player.socket) return
					// TCP keepalive
					const tcpKeepaliveBuff = new Packet(210) // TCP_STILL_ALIVE 
					player.socket.write(tcpKeepaliveBuff.transformPacket("TCP"))
					// UDP
					// Server to client test packet
					if (player.udpPort === null) return // Client hasn't sent the server any UDP packets with his udpKey
					if (player.udpReady === false) {
						const testPacketBuff = new Packet(10)
						this.udpServer.send(testPacketBuff.transformPacket("UDP"), player.udpPort, player.socket.remoteAddress)
					}
					// UDP keepalive
					const udpKeepaliveBuff = new Packet(210)
					udpKeepaliveBuff.writeUInt8(0) // TODO: Ping data https://github.com/DevLewa/Celaria-Server/blob/207b73745931561e292aeb458e24805c00640861/src/server/connection/BroadcasterUDP.java#L291
					udpKeepaliveBuff.writeUInt16LE(0)
					this.udpServer.send(udpKeepaliveBuff.transformPacket("UDP"), player.udpPort, player.socket.remoteAddress)
				} catch (error) {
					if (player.cServer.sendError) {
						player.kick(`node-celaria-server error during keepalive sending#${error.name}: ${error.message}`)
					} else {
						player.kick(`node-celaria-server error during keepalive sending#[error hidden]`)
					}
				}
			})
		}, 1000)

		this.udpServer.on('listening', () => {
			const address = this.udpServer.address()
			console.log(`server listening ${address.address}:${address.port} `)
		})

		this.tcpServer.listen(this.port)
		this.udpServer.bind(this.port)

		if (this.postToMasterServer) {
			this._postServer()
			setInterval(() => {
				this._postServer()
			}, 60000)
		}


		let ended = false

		const processExit = async () => {
			const apiVersion = 1

			const form = {
				PORT: this.port.toString(),
			}
			const API = `https://serverapi.celaria.com/${apiVersion}/remove.php`
			axios.post(API, qs.stringify(form))

			// axios.post(API).then((response) => {
			// 	console.log("Unlisted server")
			// 	console.log(response)
			process.exit()
			// }, qs.stringify(form))
		}

		process.on("SIGINT", processExit)
		process.on("SIGTERM", processExit)

		process.on("exit", () => {
			if (!ended) callback()
		})
	}

	shutdown() {
	}
}

const Vector3 = require("./class/Vector3.js")

module.exports = Server