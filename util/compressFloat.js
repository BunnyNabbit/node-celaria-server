const SmartBuffer = require("smart-buffer").SmartBuffer

function compressFloat(f) {
	f = f * 10
	let divide = f / 65535.0
	let bytes = Math.floor(divide)
	let diff = f - bytes * 65535
	bytes += 128 // bring into the 0-255 range	

	const buff = new SmartBuffer()
	buff.writeUInt8(bytes)
	buff.writeUInt16LE(diff)
	return buff.toBuffer()
}

module.exports = compressFloat