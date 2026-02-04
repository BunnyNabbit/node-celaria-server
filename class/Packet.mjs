// @ts-check
import { SmartBuffer } from "smart-buffer"
/** I am a {@link SmartBuffer} wrapper for Celaria packet headers. */
export class Packet extends SmartBuffer {
	/**@todo TypeScript fields for {@link protocol}
	 *
	 * @param {number} packetType
	 * @param {string | null} [protocol]
	 */
	constructor(packetType, protocol) {
		super()
		this.packetType = packetType
		this.protocol = protocol
	}
	/** @todo Yet to be documented. */
	transformPacket(protocol = this.protocol) {
		let length = this.length
		const packetBuffer = new SmartBuffer()
		if (protocol === "TCP") {
			packetBuffer.writeString("CSPT") // Celaria Server Package TCP
			packetBuffer.writeUInt8(this.packetType) // Packet type
			packetBuffer.writeUInt16LE(length) // Packet length
		} else if (protocol === "UDP") {
			packetBuffer.writeString("CSPU") // Celaria Server Package UDP
			packetBuffer.writeUInt8(this.packetType) // Packet type
		}
		packetBuffer.writeBuffer(this.toBuffer())

		return packetBuffer.toBuffer()
	}
}

export default Packet
