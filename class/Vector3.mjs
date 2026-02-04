// @ts-check
export class Vector3 {
	/**/
	constructor(x = 0, y = 0, z = 0) {
		/** @type {number} */
		this.x = x
		/** @type {number} */
		this.y = y
		/** @type {number} */
		this.z = z
	}
	/**@todo Yet to be documented.
	 *
	 * @param {{ x: number; y: number; z: number }} vector
	 */
	fromVector(vector) {
		this.x = vector.x
		this.y = vector.y
		this.z = vector.z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {{ x: number; y: number; z: number }} vector
	 */
	equalsVector(vector) {
		if (this.x === vector.x && this.y === vector.y && this.z === vector.z) return true
	}
	/**@todo Yet to be documented.
	 *
	 * @param {{ x: number; y: number; z: number }} vector
	 */
	addVector(vector) {
		this.x += vector.x
		this.y += vector.y
		this.z += vector.z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	add(x, y, z) {
		this.x += x
		this.y += y
		this.z += z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {{ x: number; y: number; z: number }} vector
	 */
	subVector(vector) {
		this.x -= vector.x
		this.y -= vector.y
		this.z -= vector.z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	sub(x, y, z) {
		this.x -= x
		this.y -= y
		this.z -= z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {{ x: number; y: number; z: number }} vector
	 */
	multiplyVector(vector) {
		this.x *= vector.x
		this.y *= vector.y
		this.z *= vector.z
		return this
	}
	/**@todo Yet to be documented.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	multiply(x, y, z) {
		this.x *= x
		this.y *= y
		this.z *= z
		return this
	}
}

export default Vector3
