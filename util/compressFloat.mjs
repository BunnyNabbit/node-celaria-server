// @ts-check
import { SmartBuffer } from "smart-buffer"
/**@todo Yet to be documented.
 *
 * @param {number} float
 */
export function compressFloat(float) {
	float = float * 10
	let divide = float / 65535.0
	let bytes = Math.floor(divide)
	let diff = float - bytes * 65535
	bytes += 128 // bring into the 0-255 range

	const buff = new SmartBuffer()
	buff.writeUInt8(bytes)
	buff.writeUInt16LE(diff)
	return buff.toBuffer()
}

export default compressFloat
