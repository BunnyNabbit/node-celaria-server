import { SmartBuffer } from "smart-buffer"
/** I am a {@link SmartBuffer} wrapper for Celaria packet headers. */
export class Packet extends SmartBuffer {
	packetType: number
	protocol: string
	/** @todo TypeScript fields for {@link protocol} */
	constructor(packetType: number, protocol?: string) {
		super()
		this.packetType = packetType
		this.protocol = protocol
	}

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
