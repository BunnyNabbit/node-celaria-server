// @ts-check
import { EventEmitter } from "events"
import { SmartBuffer } from "smart-buffer"
import { Packet } from "./Packet.mjs"
import { Player } from "./Player.mjs"

const PacketFragmentLength = 4096

export class MapTransmitter extends EventEmitter {
	/**@todo Yet to be documented.
	 *
	 * @param {Player} player
	 */
	constructor(player) {
		super()
		/** @type {Player} */
		this.player = player
		/** @type {SmartBuffer} */
		this.mapDataBuffer = new SmartBuffer()
	}
	/**@todo Yet to be documented.
	 *
	 * @param {Buffer} buffer
	 */
	setMapData(buffer) {
		// Set the current map buffer
		this.mapDataBuffer = SmartBuffer.fromBuffer(buffer)
	}
	/** @todo Yet to be documented. */
	sendAllPackets() {
		// Disregard waiting for the client! SEND ALL THA PACKETS!!
		while (this.sendPacket() == false) {}
	}
	/** @todo Yet to be documented. */
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

export default MapTransmitter
