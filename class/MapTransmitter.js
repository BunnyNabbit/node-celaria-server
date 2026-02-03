const EventEmitter = require("events").EventEmitter
const { SmartBuffer } = require("smart-buffer")
const Packet = require("./Packet.js")

const PacketFragmentLength = 4096

class MapTransmitter extends EventEmitter {
	/**/
	constructor(player) {
		super()
		this.player = player
		this.mapDataBuffer = new SmartBuffer()
	}

	setMapData(buff) {
		// Set the current map buffer
		this.mapDataBuffer = SmartBuffer.fromBuffer(buff)
	}

	sendAllPackets() {
		// Disregard waiting for the client! SEND ALL THA PACKETS!!
		while (this.sendPacket() == false) {}
	}

	sendPacket() {
		if (this.mapDataBuffer.remaining() === 0) {
			// There are no more map fragments to be sent
			const lastFragmentBuff = new Packet(5) // LAST_MAP_DATA_PACKET
			this.player.socket.write(lastFragmentBuff.transformPacket("TCP"))
			return true
		}

		const readBytes = Math.min(this.mapDataBuffer.remaining(), PacketFragmentLength)

		const mapFragment = this.mapDataBuffer.readBuffer(readBytes)

		const fragmentPacketBuff = new Packet(4) // MAP_DATA_PACKET
		fragmentPacketBuff.writeUInt16LE(0) // Map ID
		fragmentPacketBuff.writeBuffer(mapFragment)
		// TODO: I'm not sure if the function that is inside of MapTransmitter should be sending packets to a socket connected to the player. Behavior may change
		this.player.socket.write(fragmentPacketBuff.transformPacket("TCP"))
		return false
	}
}

module.exports = MapTransmitter
