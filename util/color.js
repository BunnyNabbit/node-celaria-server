// Convert RGB to hex
function rgbToHex(r, g, b) {
	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Convert hex to RGB
function hexToRGB(hex) {
	hex = hex.replace(/^#/, "")
	const bigint = parseInt(hex, 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255
	return [r, g, b]
}
module.exports = { rgbToHex, hexToRGB }