// @ts-check
/**Convert RGB to hex.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function rgbToHex(r, g, b) {
	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
/**Convert hex to RGB.
 *
 * @param {string} hex
 */
export function hexToRGB(hex) {
	hex = hex.replace(/^#/, "")
	const bigint = parseInt(hex, 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255
	return [r, g, b]
}
